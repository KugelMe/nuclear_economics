$(document).ready(function() {
  if (fontLoaded) {
    start();
  } else {
    var interval = setInterval(function() {
      if (fontLoaded) {
        clearInterval(interval);
        start();
      }
    }, 100);
  }
});

var cfg = {
  maxDepth: 4,
  colorIdx: 0,
  /* Configure Colors Here */
  colors: [
    "#55c8e8", 
    "#40349b", //#1e165a
    "#1e165a", 
    "#6fcde8", //#55c8e8
    "#ff9f7c", //ff6d37
    "#355370", //5d6670
    "#ff6d37", 
    "#736e9b", //#1e165a
    "#104547", 
    "#5444c9", //#1e165a
    "#99D6E8", //#55c8e8
    "#47A9AD", //104547
    "#ffbba3", //ff6d37
    "#445a70", //5d6670
    "#2c6b6d", //104547
    "#5d6670",
    "#84d2e8", //#55c8e8
    "#4c467a", //#1e165a
    "#ff8154", //ff6d37
    "#2392AA", //104547
    "#5482AF" //5d6670
  ],
  widthThreshhold: 600
};

function coerce(hex) {
  if (hex > 255) return 255;
  if (hex < 0) return 0;
  return hex;
}

/*
function createShades(colors) {
  var newColors = [];
  for (var x = 0; x < colors.length; ++x) {
    var r = colors[x].substring(1, 3);
    var g = colors[x].substring(3, 5);
    var b = colors[x].substring(5, 7); 
    for (var y = 1; y < 6; ++y) {
      var newColor = "#"; 
      var newR1 = coerce(parseInt(r, 16) + (10 * y));
      var newG1 = coerce(parseInt(g, 16) + (30 * y));
      var newB1 = b;
      newColor += newR1.toString(16) + newG1.toString(16) + newB1.toString(16);
      newColors.push(newColor);
    }
  }
  return newColors;
}
*/

function getFontColor(bgColor) {
  var _sum = parseInt(bgColor.substring(1, 3), 16);
  _sum += parseInt(bgColor.substring(3, 5), 16);
  _sum += parseInt(bgColor.substring(5, 7), 16);
  _sum /= 3;
  return _sum > 127 ? '#000000' : '#ffffff';
}

function setValue(node, depth) {
  var _sum = 0;
  for (var x = 0; x < node.children.length; ++x) {
    if (depth === cfg.maxDepth - 1) {
      _sum += node.children[x].value;
    } else {
      var childSum = setValue(node.children[x], depth + 1);
      node.children[x].value = childSum;
      _sum += childSum;
    }
  }
  if (depth === 0) node.value = _sum;
  return _sum;
}

function setAvg(node, depth) {
  var _sum = 0;
  for (var x = 0; x < node.children.length; ++x) {
    if (depth === cfg.maxDepth - 2) {
      _sum += node.children[x].avg;
    } else {
      var childSum = setAvg(node.children[x], depth + 1);
      node.children[x].avg = childSum;
      _sum += childSum;
    }
  }
  if (depth === 0) node.avg = _sum;
  return _sum;
}

function upColor() {
  if (cfg.colorIdx + 1 < cfg.colors.length) {
    cfg.colorIdx = cfg.colorIdx + 1;
  } else {
    cfg.colorIdx = 0;
  }
}

function setColor(node, depth) {
  if (!node.color) {
    node.color = cfg.colors[cfg.colorIdx];
    upColor();
  }
  if (node.children) {
    for (var x = 0; x < node.children.length; ++x) {
      setColor(node.children[x]);
    }
  }
}

function comma(str) {
  str = str.toString();
  if (str.length < 4) return str;
  var newStr = "";
  var three = 0;
  for (var x = str.length - 1; x > -1; --x) {
    newStr = str[x] + newStr;
    three += 1;
    if (three === 3 && x > 0) {
      newStr = "," + newStr;
      three = 0;
    }
  }
  return newStr;
}

function binarize(node) {
  if (!node._children) node._children = Object.assign([], node.children);
  if (!node._children.length) return null;
  var leftVal = 0,
    leftIdx = 0,
    leftNode = node._children[0];
  for (var x = 0; x < node._children.length; ++x) {
    if (node._children[x].value > leftVal) {
      leftVal = node._children[x].value;
      leftNode = node._children[x];
      leftIdx = x;
    }
  }
  node._children.splice(leftIdx, 1);
  node.left = leftNode;
  node.right = {
    value: node.value - node.left.value,
    _children: Object.assign([], node._children)
  };
  node.left.parent = node.parent;
  node.right.parent = node.parent;
  binarize(node.right);
}

function binarizeAll(node) {
  binarize(node);
  if (node.children) {
    for (var x = 0; x < node.children.length; ++x) {
      node.children[x].parent = node;
      binarizeAll(node.children[x]);
    }
  }
}

function renderHeader(node) {
  if (!$("#header").length) {
    var header = document.createElement("div");
    header.id = "header";
    $("#canvas").append(header);
    var ancestry = getAncestry(node, []);
    $("#header").html(
      "<div id='header_name'>" +
        ancestry.history +
        "<b id='header_tail'>" +
        ancestry.tail +
        "</b></div>"
    );
    $("#header").css("background-color", "#FFFFFF");
    $("#header").css("cursor", "pointer");
    $("#header").append(
      "<div id='header_value'>$" + comma(Math.round(node.value)) + "</div>"
    );
    $("#header").append(
      "<div id='header_avg'>$" + comma(Math.round(node.avg)) + "/kW</div>"
    );
    $("#header").click(function() {
      //console.log("clicked header");
      if (currentNode.parent) {
        currentNode = currentNode.parent;
        render(currentNode, 0);
      }
    });
  } else {
    var ancestry = getAncestry(node, []);
    $("#header_name").html(
      ancestry.history + "<b id='header_tail'>" + ancestry.tail + "</b>"
    );
    $("#header_value").html("$" + comma(Math.round(node.value)));
    $("#header_avg").html("$" + comma(Math.round(node.avg)) + "/kW");
  }
}

function calc(node, depth) {
  if (depth === 0) {
    var w = window.innerWidth;
    var h = window.innerHeight - $("#header").height();
  } else {
    var w = $("#right" + (depth - 1)).width();
    var h = $("#right" + (depth - 1)).height();
  }
  var o = "v";
  if (w > cfg.widthThreshhold && w > h) o = "h";
  var ratio = node.left.value / node.value;

  var splits = {
    o: o,
    left: { width: null, height: null },
    right: { width: null, height: null }
  };
  if (o === "h") {
    splits.left.width = Math.round(ratio * w);
    splits.left.height = h;
    splits.right.width = w - splits.left.width;
    splits.right.height = h;
  } else {
    splits.left.width = w;
    splits.left.height = Math.round(ratio * h);
    splits.right.width = w;
    splits.right.height = h - splits.left.height;
  }
  node.splits = splits;
  return splits;
}

function render(node, depth) {
  if (depth === 0) renderHeader(node);

  calc(node, depth);

  if (depth === 0) {
    var parentId = "#canvas";
  } else {
    var parentId = "#right" + (depth - 1);
  }

  if (!$("#left" + depth).length) {
    $("<div/>", {
      id: "left" + depth
    }).appendTo(parentId);
    $("#left" + depth).css("color", getFontColor(node.left.color));
    $("#left" + depth).css("background-color", node.left.color);
    $("#left" + depth).css("cursor", "pointer");
    $("#left" + depth).append(
      "<div id='left" + depth + "_name" + "'>" + node.left.name + "</div>"
    );
    $("#left" + depth).append(
      "<div id='left" +
        depth +
        "_value" +
        "'>" +
        "$" +
        comma(Math.round(node.left.value)) +
        "</div>"
    );
  } else {
    $("#left" + depth).unbind();
    $("#left" + depth + "_name").html(node.left.name);
    $("#left" + depth + "_value").html(
      "$" + comma(Math.round(node.left.value))
    );
  }
  $("#left" + depth).one(
    "click",
    function(node, depth) {
      if (node.left.left) {
        currentNode = node.left;
        render(currentNode, 0);
      }
    }.bind(this, node, depth)
  );
  $("#left" + depth).css("width", node.splits.left.width);
  $("#left" + depth).css("height", node.splits.left.height);

  if (!$("#right" + depth).length) {
    $("<div/>", {
      id: "right" + depth
    }).appendTo(parentId);
    $("#right" + depth).css("cursor", "pointer");
    $("#right" + depth).css("vertical-align", "top");
  }
  $("#right" + depth).css("width", node.splits.right.width);
  $("#right" + depth).css("height", node.splits.right.height);

  if (node.splits.o === "h") {
    $("#left" + depth).css("display", "inline-block");
    $("#right" + depth).css("display", "inline-block");
  }

  if (node.right.left) render(node.right, depth + 1);
}

var currentNode = root;

function getAncestry(node, path) {
  if (!node.parent) {
    path = [node.name].concat(path);
    var tail = path.pop();
    path = path.join("/");
    if (path.length) path = path + "/";
    return {
      history: path,
      tail: tail
    };
  }
  if (node.name) path = [node.name].concat(path);
  var res = getAncestry(node.parent, path);
  if (res) return res;
}

function start() {
  setAvg(root, 0);
  setValue(root, 0);
  setColor(root, 0);
  binarizeAll(root);
  render(root, 0);
  window.addEventListener("resize", function() {
    render(currentNode, 0);
  });
}
