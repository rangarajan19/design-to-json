// Design to JSON - Figma Plugin
// Extracts all relevant design information from a selected frame

figma.showUI(__html__, { width: 480, height: 600, title: "Design to JSON" });

figma.ui.onmessage = (msg) => {
  if (msg.type === "extract") {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({ type: "error", message: "No frame selected. Please select a frame." });
      return;
    }
    if (selection.length > 1) {
      figma.ui.postMessage({ type: "error", message: "Please select only one frame." });
      return;
    }
    const node = selection[0];
    if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") {
      figma.ui.postMessage({ type: "error", message: "Selected item is not a frame. Please select a frame." });
      return;
    }
    const json = extractNode(node, true);
    figma.ui.postMessage({ type: "result", data: json });
  }

  if (msg.type === "close") {
    figma.closePlugin();
  }
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function rgbaToHex(r, g, b, a) {
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return a !== undefined && a < 1 ? { hex, opacity: parseFloat(a.toFixed(3)) } : { hex };
}

function paintToObject(paint) {
  if (!paint.visible && paint.visible !== undefined) return null;
  const base = { type: paint.type, blendMode: paint.blendMode, opacity: paint.opacity ?? 1 };

  if (paint.type === "SOLID") {
    const { hex, opacity } = rgbaToHex(paint.color.r, paint.color.g, paint.color.b, paint.color.a);
    return { ...base, hex, colorOpacity: opacity };
  }
  if (paint.type === "GRADIENT_LINEAR" || paint.type === "GRADIENT_RADIAL" ||
      paint.type === "GRADIENT_ANGULAR" || paint.type === "GRADIENT_DIAMOND") {
    return {
      ...base,
      gradientStops: paint.gradientStops.map((s) => ({
        position: parseFloat(s.position.toFixed(3)),
        ...rgbaToHex(s.color.r, s.color.g, s.color.b, s.color.a),
      })),
      gradientTransform: paint.gradientTransform,
    };
  }
  if (paint.type === "IMAGE") {
    return { ...base, scaleMode: paint.scaleMode, imageHash: paint.imageHash };
  }
  return base;
}

function effectToObject(effect) {
  const base = { type: effect.type, visible: effect.visible ?? true };
  if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
    return {
      ...base,
      ...rgbaToHex(effect.color.r, effect.color.g, effect.color.b, effect.color.a),
      offset: { x: effect.offset.x, y: effect.offset.y },
      radius: effect.radius,
      spread: effect.spread ?? 0,
      blendMode: effect.blendMode,
    };
  }
  if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
    return { ...base, radius: effect.radius };
  }
  return base;
}

function strokesInfo(node) {
  if (!node.strokes || node.strokes.length === 0) return null;
  return {
    strokes: node.strokes.map(paintToObject).filter(Boolean),
    strokeWeight: node.strokeWeight ?? null,
    strokeAlign: node.strokeAlign ?? null,
    strokeDashes: node.dashPattern && node.dashPattern.length > 0 ? node.dashPattern : null,
    strokeCap: node.strokeCap ?? null,
    strokeJoin: node.strokeJoin ?? null,
    strokeMiterLimit: node.strokeMiterLimit ?? null,
    strokeTopWeight: node.strokeTopWeight ?? null,
    strokeBottomWeight: node.strokeBottomWeight ?? null,
    strokeLeftWeight: node.strokeLeftWeight ?? null,
    strokeRightWeight: node.strokeRightWeight ?? null,
  };
}

function cornerInfo(node) {
  const result = {};
  if ("cornerRadius" in node && node.cornerRadius !== figma.mixed) {
    result.cornerRadius = node.cornerRadius;
  }
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
    counterAxisAlignContent: node.counterAxisAlignContent ?? null,
    paddingTop: node.paddingTop,
    paddingBottom: node.paddingBottom,
    paddingLeft: node.paddingLeft,
    paddingRight: node.paddingRight,
    itemSpacing: node.itemSpacing,
    counterAxisSpacing: node.counterAxisSpacing ?? null,
    layoutWrap: node.layoutWrap ?? null,
    strokesIncludedInLayout: node.strokesIncludedInLayout ?? false,
    itemReverseZIndex: node.itemReverseZIndex ?? false,
  };
}

function layoutChildInfo(node) {
  const result = {};
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

  const getSegments = () => {
    try {
      const segments = node.getStyledTextSegments([
        "fontName", "fontSize", "fontWeight", "letterSpacing", "lineHeight",
        "textDecoration", "textCase", "fills", "textStyleId", "hyperlink",
        "listOptions", "indentation",
      ]);
      return segments.map((seg) => ({
        characters: seg.characters,
        start: seg.start,
        end: seg.end,
        fontFamily: seg.fontName?.family,
        fontStyle: seg.fontName?.style,
        fontSize: seg.fontSize,
        letterSpacing: seg.letterSpacing,
        lineHeight: seg.lineHeight,
        textDecoration: seg.textDecoration,
        textCase: seg.textCase,
        fills: seg.fills?.map(paintToObject).filter(Boolean),
        textStyleId: seg.textStyleId || null,
        hyperlink: seg.hyperlink || null,
        listOptions: seg.listOptions || null,
        indentation: seg.indentation,
      }));
    } catch (e) {
      return null;
    }
  };

  return {
    characters: node.characters,
    textAlignHorizontal: node.textAlignHorizontal,
    textAlignVertical: node.textAlignVertical,
    textAutoResize: node.textAutoResize,
    textTruncation: node.textTruncation ?? null,
    maxLines: node.maxLines ?? null,
    paragraphIndent: node.paragraphIndent,
    paragraphSpacing: node.paragraphSpacing,
    textStyleId: node.textStyleId || null,
    // top-level font (may be mixed)
    fontFamily: node.fontName !== figma.mixed ? node.fontName?.family : "MIXED",
    fontStyle: node.fontName !== figma.mixed ? node.fontName?.style : "MIXED",
    fontSize: node.fontSize !== figma.mixed ? node.fontSize : "MIXED",
    letterSpacing: node.letterSpacing !== figma.mixed ? node.letterSpacing : "MIXED",
    lineHeight: node.lineHeight !== figma.mixed ? node.lineHeight : "MIXED",
    textDecoration: node.textDecoration !== figma.mixed ? node.textDecoration : "MIXED",
    textCase: node.textCase !== figma.mixed ? node.textCase : "MIXED",
    styledSegments: getSegments(),
  };
}

function prototypeInfo(node) {
  const reactions = node.reactions;
  if (!reactions || reactions.length === 0) return null;

  return reactions.map((r) => {
    const trigger = r.trigger;
    const action = r.action;
    const result = { trigger: null, action: null };

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
          direction: action.transition.direction ?? null,
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
    const style = figma.getStyleById(styleId);
    return style ? style.name : null;
  } catch (e) {
    return null;
  }
}

function componentInfo(node) {
  if (node.type !== "INSTANCE") return null;
  try {
    const main = node.mainComponent;
    if (!main) return { mainComponentId: null };
    return {
      mainComponentId: main.id,
      mainComponentName: main.name,
      componentSetName: main.parent?.type === "COMPONENT_SET" ? main.parent.name : null,
      overrides: node.overrides
        ? node.overrides.map((o) => ({
            id: o.id,
            overriddenFields: o.overriddenFields,
          }))
        : [],
    };
  } catch (e) {
    return null;
  }
}

function sizeAndPosition(node) {
  return {
    x: parseFloat(node.x.toFixed(2)),
    y: parseFloat(node.y.toFixed(2)),
    width: parseFloat(node.width.toFixed(2)),
    height: parseFloat(node.height.toFixed(2)),
    rotation: node.rotation ? parseFloat(node.rotation.toFixed(2)) : 0,
    relativeTransform: node.relativeTransform,
    constraints: "constraints" in node ? node.constraints : null,
  };
}

function exportSettings(node) {
  if (!node.exportSettings || node.exportSettings.length === 0) return null;
  return node.exportSettings.map((s) => ({
    format: s.format,
    suffix: s.suffix,
    constraint: s.constraint,
  }));
}

// ─── Core extractor ─────────────────────────────────────────────────────────

function extractNode(node, isRoot = false) {
  const obj = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible ?? true,
    locked: node.locked ?? false,
    opacity: "opacity" in node ? node.opacity : 1,
    blendMode: "blendMode" in node ? node.blendMode : null,
    isMask: "isMask" in node ? node.isMask : false,
    ...sizeAndPosition(node),
  };

  // Fills
  if ("fills" in node && node.fills !== figma.mixed && node.fills.length > 0) {
    obj.fills = node.fills.map(paintToObject).filter(Boolean);
    if (node.fillStyleId) obj.fillStyleName = resolveStyleName(node.fillStyleId);
  }

  // Strokes
  const strokes = strokesInfo(node);
  if (strokes) Object.assign(obj, strokes);
  if (node.strokeStyleId) obj.strokeStyleName = resolveStyleName(node.strokeStyleId);

  // Effects
  if ("effects" in node && node.effects.length > 0) {
    obj.effects = node.effects.map(effectToObject);
    if (node.effectStyleId) obj.effectStyleName = resolveStyleName(node.effectStyleId);
  }

  // Corners
  const corners = cornerInfo(node);
  if (corners) obj.corners = corners;

  // Auto Layout
  const al = autoLayoutInfo(node);
  if (al) obj.autoLayout = al;

  // Layout child props
  if (!isRoot) {
    const lc = layoutChildInfo(node);
    if (lc) obj.layoutChild = lc;
  }

  // Text
  const text = textStyleInfo(node);
  if (text) obj.text = text;

  // Prototype
  const proto = prototypeInfo(node);
  if (proto) obj.prototype = proto;

  // Component instance
  const comp = componentInfo(node);
  if (comp) obj.component = comp;

  // Export settings
  const exp = exportSettings(node);
  if (exp) obj.exportSettings = exp;

  // Grid / Guide styles (frames)
  if ("layoutGrids" in node && node.layoutGrids.length > 0) {
    obj.layoutGrids = node.layoutGrids.map((g) => ({
      pattern: g.pattern,
      visible: g.visible ?? true,
      color: rgbaToHex(g.color.r, g.color.g, g.color.b, g.color.a),
      alignment: g.alignment ?? null,
      gutterSize: g.gutterSize ?? null,
      count: g.count ?? null,
      sectionSize: g.sectionSize ?? null,
      offset: g.offset ?? null,
    }));
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
    obj.children = node.children.map((child) => extractNode(child, false));
  }

  return obj;
}
