// Design to JSON - Figma Plugin
// Extracts all relevant design information from a selected frame

figma.showUI(__html__, { width: 480, height: 600, title: "Design to JSON" });

figma.ui.onmessage = function (msg) {
  if (msg.type === "extract") {
    var selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({ type: "error", message: "No frame selected. Please select a frame." });
      return;
    }
    if (selection.length > 1) {
      figma.ui.postMessage({ type: "error", message: "Please select only one frame." });
      return;
    }
    var node = selection[0];
    if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") {
      figma.ui.postMessage({ type: "error", message: "Selected item is not a frame. Please select a frame." });
      return;
    }
    var json = extractNode(node, true);
    // Serialize through JSON to strip any remaining Figma internal types
    var safeJson = JSON.parse(JSON.stringify(json));
    figma.ui.postMessage({ type: "result", data: safeJson });
  }

  if (msg.type === "close") {
    figma.closePlugin();
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function def(val, fallback) {
  return (val !== undefined && val !== null) ? val : fallback;
}

function rgbaToHex(r, g, b) {
  function toHex(v) { return Math.round(v * 255).toString(16).padStart(2, "0"); }
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

function toRgba(r, g, b, a) {
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: parseFloat((a !== undefined ? a : 1).toFixed(3)),
  };
}

function paintToObject(paint) {
  var visible = (paint.visible !== undefined) ? paint.visible : true;
  var base = { type: paint.type, visible: visible, blendMode: paint.blendMode, opacity: def(paint.opacity, 1) };

  if (paint.type === "SOLID") {
    var hex = rgbaToHex(paint.color.r, paint.color.g, paint.color.b);
    var rgba = toRgba(paint.color.r, paint.color.g, paint.color.b, paint.color.a);
    return { type: base.type, visible: visible, blendMode: base.blendMode, opacity: base.opacity, hex: hex, rgba: rgba };
  }
  if (paint.type === "GRADIENT_LINEAR" || paint.type === "GRADIENT_RADIAL" ||
      paint.type === "GRADIENT_ANGULAR" || paint.type === "GRADIENT_DIAMOND") {
    return {
      type: base.type, visible: visible, blendMode: base.blendMode, opacity: base.opacity,
      gradientStops: paint.gradientStops.map(function (s) {
        return {
          position: parseFloat(s.position.toFixed(3)),
          hex: rgbaToHex(s.color.r, s.color.g, s.color.b),
          rgba: toRgba(s.color.r, s.color.g, s.color.b, s.color.a),
        };
      }),
      gradientTransform: paint.gradientTransform,
    };
  }
  if (paint.type === "IMAGE") {
    return { type: base.type, visible: visible, blendMode: base.blendMode, opacity: base.opacity, scaleMode: paint.scaleMode, imageHash: paint.imageHash };
  }
  return base;
}

function effectToObject(effect) {
  var base = { type: effect.type, visible: def(effect.visible, true) };
  if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
    return {
      type: base.type, visible: base.visible,
      hex: rgbaToHex(effect.color.r, effect.color.g, effect.color.b),
      rgba: toRgba(effect.color.r, effect.color.g, effect.color.b, effect.color.a),
      offset: { x: effect.offset.x, y: effect.offset.y },
      radius: effect.radius,
      spread: def(effect.spread, 0),
      blendMode: effect.blendMode,
    };
  }
  if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
    return { type: base.type, visible: base.visible, radius: effect.radius };
  }
  return base;
}

function strokesInfo(node) {
  if (!node.strokes || node.strokes.length === 0) return null;
  return {
    strokes: node.strokes.map(paintToObject).filter(Boolean),
    strokeWeight: def(node.strokeWeight, null),
    strokeAlign: def(node.strokeAlign, null),
    strokeDashes: (node.dashPattern && node.dashPattern.length > 0) ? node.dashPattern : null,
    strokeCap: def(node.strokeCap, null),
    strokeJoin: def(node.strokeJoin, null),
    strokeMiterLimit: def(node.strokeMiterLimit, null),
    strokeTopWeight: def(node.strokeTopWeight, null),
    strokeBottomWeight: def(node.strokeBottomWeight, null),
    strokeLeftWeight: def(node.strokeLeftWeight, null),
    strokeRightWeight: def(node.strokeRightWeight, null),
  };
}

function cornerInfo(node) {
  var result = {};
  if ("cornerRadius" in node && node.cornerRadius !== figma.mixed) result.cornerRadius = node.cornerRadius;
  if ("topLeftRadius" in node) result.topLeftRadius = node.topLeftRadius;
  if ("topRightRadius" in node) result.topRightRadius = node.topRightRadius;
  if ("bottomLeftRadius" in node) result.bottomLeftRadius = node.bottomLeftRadius;
  if ("bottomRightRadius" in node) result.bottomRightRadius = node.bottomRightRadius;
  if ("cornerSmoothing" in node) result.cornerSmoothing = node.cornerSmoothing;
  return Object.keys(result).length > 0 ? result : null;
}

function autoLayoutInfo(node) {
  if (!("layoutMode" in node) || node.layoutMode === "NONE") return null;
  return {
    layoutMode: node.layoutMode,
    primaryAxisSizingMode: node.primaryAxisSizingMode,
    counterAxisSizingMode: node.counterAxisSizingMode,
    primaryAxisAlignItems: node.primaryAxisAlignItems,
    counterAxisAlignItems: node.counterAxisAlignItems,
    counterAxisAlignContent: def(node.counterAxisAlignContent, null),
    paddingTop: node.paddingTop,
    paddingBottom: node.paddingBottom,
    paddingLeft: node.paddingLeft,
    paddingRight: node.paddingRight,
    itemSpacing: node.itemSpacing,
    counterAxisSpacing: def(node.counterAxisSpacing, null),
    layoutWrap: def(node.layoutWrap, null),
    strokesIncludedInLayout: def(node.strokesIncludedInLayout, false),
    itemReverseZIndex: def(node.itemReverseZIndex, false),
  };
}

function layoutChildInfo(node) {
  var result = {};
  if ("layoutAlign" in node) result.layoutAlign = node.layoutAlign;
  if ("layoutGrow" in node) result.layoutGrow = node.layoutGrow;
  if ("layoutPositioning" in node) result.layoutPositioning = node.layoutPositioning;
  if ("minWidth" in node && node.minWidth !== null) result.minWidth = node.minWidth;
  if ("maxWidth" in node && node.maxWidth !== null) result.maxWidth = node.maxWidth;
  if ("minHeight" in node && node.minHeight !== null) result.minHeight = node.minHeight;
  if ("maxHeight" in node && node.maxHeight !== null) result.maxHeight = node.maxHeight;
  return Object.keys(result).length > 0 ? result : null;
}

function textStyleInfo(node) {
  if (node.type !== "TEXT") return null;

  function getSegments() {
    try {
      var segments = node.getStyledTextSegments([
        "fontName", "fontSize", "fontWeight", "letterSpacing", "lineHeight",
        "textDecoration", "textCase", "fills", "textStyleId", "hyperlink",
        "listOptions", "indentation",
      ]);
      return segments.map(function (seg) {
        return {
          characters: seg.characters,
          start: seg.start,
          end: seg.end,
          fontFamily: seg.fontName ? seg.fontName.family : null,
          fontStyle: seg.fontName ? seg.fontName.style : null,
          fontWeight: seg.fontWeight || null,
          fontSize: seg.fontSize,
          letterSpacing: seg.letterSpacing,
          lineHeight: seg.lineHeight,
          textDecoration: seg.textDecoration,
          textCase: seg.textCase,
          fills: seg.fills ? seg.fills.map(paintToObject).filter(Boolean) : null,
          textStyleId: seg.textStyleId || null,
          textStyleName: seg.textStyleId ? resolveStyleName(seg.textStyleId) : null,
          hyperlink: seg.hyperlink || null,
          listOptions: seg.listOptions || null,
          indentation: seg.indentation,
        };
      });
    } catch (e) {
      return null;
    }
  }

  var fontName = node.fontName !== figma.mixed ? node.fontName : null;
  var textStyleId = node.textStyleId || null;
  return {
    characters: node.characters,
    textAlignHorizontal: node.textAlignHorizontal,
    textAlignVertical: node.textAlignVertical,
    textAutoResize: node.textAutoResize,
    textTruncation: def(node.textTruncation, null),
    maxLines: def(node.maxLines, null),
    paragraphIndent: node.paragraphIndent,
    paragraphSpacing: node.paragraphSpacing,
    textStyleId: textStyleId,
    textStyleName: textStyleId ? resolveStyleName(textStyleId) : null,
    fontFamily: fontName ? fontName.family : "MIXED",
    fontStyle: fontName ? fontName.style : "MIXED",
    fontWeight: node.fontWeight !== figma.mixed ? node.fontWeight : "MIXED",
    fontSize: node.fontSize !== figma.mixed ? node.fontSize : "MIXED",
    letterSpacing: node.letterSpacing !== figma.mixed ? node.letterSpacing : "MIXED",
    lineHeight: node.lineHeight !== figma.mixed ? node.lineHeight : "MIXED",
    textDecoration: node.textDecoration !== figma.mixed ? node.textDecoration : "MIXED",
    textCase: node.textCase !== figma.mixed ? node.textCase : "MIXED",
    styledSegments: getSegments(),
  };
}

function prototypeInfo(node) {
  var reactions = node.reactions;
  if (!reactions || reactions.length === 0) return null;

  return reactions.map(function (r) {
    var trigger = r.trigger;
    var action = r.action;
    var result = { trigger: null, action: null };

    if (trigger) {
      result.trigger = { type: trigger.type };
      if (trigger.delay !== undefined) result.trigger.delay = trigger.delay;
      if (trigger.timeout !== undefined) result.trigger.timeout = trigger.timeout;
      if (trigger.keyCode !== undefined) result.trigger.keyCode = trigger.keyCode;
    }

    if (action) {
      result.action = { type: action.type };
      if (action.destinationId) result.action.destinationId = action.destinationId;
      if (action.navigation) result.action.navigation = action.navigation;
      if (action.transition) {
        result.action.transition = {
          type: action.transition.type,
          duration: action.transition.duration,
          easing: action.transition.easing,
          direction: def(action.transition.direction, null),
        };
      }
      if (action.url) result.action.url = action.url;
      if (action.overlayRelativePosition) result.action.overlayRelativePosition = action.overlayRelativePosition;
    }

    return result;
  });
}

function resolveStyleName(styleId) {
  if (!styleId) return null;
  try {
    var style = figma.getStyleById(styleId);
    return style ? style.name : null;
  } catch (e) {
    return null;
  }
}

function componentInfo(node) {
  if (node.type !== "INSTANCE") return null;
  try {
    var main = node.mainComponent;
    if (!main) return { mainComponentId: null };
    var parentNode = main.parent;
    var isSet = parentNode && parentNode.type === "COMPONENT_SET";

    // Component properties (variant, boolean, text, instance swap)
    var componentProps = null;
    try {
      if (node.componentProperties) {
        componentProps = {};
        var cpKeys = Object.keys(node.componentProperties);
        for (var i = 0; i < cpKeys.length; i++) {
          componentProps[cpKeys[i]] = node.componentProperties[cpKeys[i]];
        }
      }
    } catch (e) {}

    // Overrides list
    var overrides = node.overrides
      ? node.overrides.map(function (o) { return { id: o.id, overriddenFields: o.overriddenFields }; })
      : [];

    // Fields overridden specifically on the root instance node
    var rootOverridden = [];
    for (var j = 0; j < overrides.length; j++) {
      if (overrides[j].id === node.id) { rootOverridden = overrides[j].overriddenFields; break; }
    }

    // Inline base styles from master for fields the instance does NOT override
    var baseStyles = {};
    if (main.fills && main.fills !== figma.mixed && main.fills.length > 0 &&
        rootOverridden.indexOf("fills") === -1) {
      baseStyles.fills = main.fills.map(paintToObject).filter(Boolean);
    }
    if (main.strokes && main.strokes.length > 0 &&
        rootOverridden.indexOf("strokes") === -1) {
      var si = strokesInfo(main);
      if (si) baseStyles.strokes = si;
    }
    if (main.effects && main.effects.length > 0 &&
        rootOverridden.indexOf("effects") === -1) {
      baseStyles.effects = main.effects.map(effectToObject);
    }
    var mc = cornerInfo(main);
    if (mc && rootOverridden.indexOf("cornerRadius") === -1) {
      baseStyles.corners = mc;
    }

    return {
      mainComponentId: main.id,
      mainComponentName: main.name,
      componentSetId: isSet ? parentNode.id : null,
      componentSetName: isSet ? parentNode.name : null,
      componentProperties: componentProps,
      overrides: overrides,
      baseStyles: Object.keys(baseStyles).length > 0 ? baseStyles : null,
    };
  } catch (e) {
    return null;
  }
}

function serializeTransform(t) {
  // relativeTransform is a Figma internal type — convert to plain nested array
  if (!t) return null;
  return [
    [t[0][0], t[0][1], t[0][2]],
    [t[1][0], t[1][1], t[1][2]],
  ];
}

function sizeAndPosition(node) {
  return {
    x: parseFloat(node.x.toFixed(2)),
    y: parseFloat(node.y.toFixed(2)),
    width: parseFloat(node.width.toFixed(2)),
    height: parseFloat(node.height.toFixed(2)),
    rotation: node.rotation ? parseFloat(node.rotation.toFixed(2)) : 0,
    relativeTransform: serializeTransform(node.relativeTransform),
    constraints: "constraints" in node ? node.constraints : null,
  };
}

function exportSettings(node) {
  if (!node.exportSettings || node.exportSettings.length === 0) return null;
  return node.exportSettings.map(function (s) {
    return { format: s.format, suffix: s.suffix, constraint: s.constraint };
  });
}

// ─── Core extractor ──────────────────────────────────────────────────────────

function extractNode(node, isRoot) {
  if (isRoot === undefined) isRoot = false;

  var pos = sizeAndPosition(node);
  var obj = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: def(node.visible, true),
    locked: def(node.locked, false),
    opacity: "opacity" in node ? node.opacity : 1,
    blendMode: "blendMode" in node ? node.blendMode : null,
    isMask: "isMask" in node ? node.isMask : false,
    x: pos.x,
    y: pos.y,
    width: pos.width,
    height: pos.height,
    rotation: pos.rotation,
    relativeTransform: pos.relativeTransform,
    constraints: pos.constraints,
  };

  // Fills
  if ("fills" in node && node.fills !== figma.mixed && node.fills.length > 0) {
    obj.fills = node.fills.map(paintToObject).filter(Boolean);
    if (node.fillStyleId) obj.fillStyleName = resolveStyleName(node.fillStyleId);
  }

  // Strokes
  var strokes = strokesInfo(node);
  if (strokes) {
    obj.strokes = strokes.strokes;
    obj.strokeWeight = strokes.strokeWeight;
    obj.strokeAlign = strokes.strokeAlign;
    obj.strokeDashes = strokes.strokeDashes;
    obj.strokeCap = strokes.strokeCap;
    obj.strokeJoin = strokes.strokeJoin;
    obj.strokeMiterLimit = strokes.strokeMiterLimit;
    obj.strokeTopWeight = strokes.strokeTopWeight;
    obj.strokeBottomWeight = strokes.strokeBottomWeight;
    obj.strokeLeftWeight = strokes.strokeLeftWeight;
    obj.strokeRightWeight = strokes.strokeRightWeight;
  }
  if (node.strokeStyleId) obj.strokeStyleName = resolveStyleName(node.strokeStyleId);

  // Effects
  if ("effects" in node && node.effects.length > 0) {
    obj.effects = node.effects.map(effectToObject);
    if (node.effectStyleId) obj.effectStyleName = resolveStyleName(node.effectStyleId);
  }

  // Corners
  var corners = cornerInfo(node);
  if (corners) obj.corners = corners;

  // Auto Layout
  var al = autoLayoutInfo(node);
  if (al) obj.autoLayout = al;

  // Layout child props
  if (!isRoot) {
    var lc = layoutChildInfo(node);
    if (lc) obj.layoutChild = lc;
  }

  // Text
  var text = textStyleInfo(node);
  if (text) obj.text = text;

  // Prototype
  var proto = prototypeInfo(node);
  if (proto) obj.prototype = proto;

  // Component instance
  var comp = componentInfo(node);
  if (comp) obj.component = comp;

  // Export settings
  var exp = exportSettings(node);
  if (exp) obj.exportSettings = exp;

  // Layout Grids
  if ("layoutGrids" in node && node.layoutGrids.length > 0) {
    obj.layoutGrids = node.layoutGrids.map(function (g) {
      var gc = rgbaToHex(g.color.r, g.color.g, g.color.b, g.color.a);
      return {
        pattern: g.pattern,
        visible: def(g.visible, true),
        color: gc,
        alignment: def(g.alignment, null),
        gutterSize: def(g.gutterSize, null),
        count: def(g.count, null),
        sectionSize: def(g.sectionSize, null),
        offset: def(g.offset, null),
      };
    });
    if (node.gridStyleId) obj.gridStyleName = resolveStyleName(node.gridStyleId);
  }

  // Clip content
  if ("clipsContent" in node) obj.clipsContent = node.clipsContent;

  // Background
  if ("backgrounds" in node && node.backgrounds.length > 0) {
    obj.backgrounds = node.backgrounds.map(paintToObject).filter(Boolean);
    if (node.backgroundStyleId) obj.backgroundStyleName = resolveStyleName(node.backgroundStyleId);
  }

  // Children (recursive)
  if ("children" in node && node.children.length > 0) {
    obj.children = node.children.map(function (child) { return extractNode(child, false); });
  }

  return obj;
}
