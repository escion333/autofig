// Auto-generated from TypeScript source. Do not edit directly.
// Run `bun run build:plugin` to rebuild.

"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // src/shared/utils/color.ts
  function rgbaToHex(color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a !== void 0 ? Math.round(color.a * 255) : 255;
    if (a === 255) {
      return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
    }
    return "#" + [r, g, b, a].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  __name(rgbaToHex, "rgbaToHex");

  // src/shared/utils/node-filter.ts
  function filterFigmaNode(node) {
    if (node.type === "VECTOR") {
      return null;
    }
    const filtered = {
      id: node.id,
      name: node.name,
      type: node.type
    };
    if (node.fills && node.fills.length > 0) {
      filtered.fills = node.fills.map((fill) => {
        const processedFill = {
          type: fill.type
        };
        if (fill.gradientStops) {
          processedFill.gradientStops = fill.gradientStops.map((stop) => ({
            position: stop.position,
            color: stop.color ? rgbaToHex(stop.color) : "#000000"
          }));
        }
        if (fill.color) {
          processedFill.color = rgbaToHex(fill.color);
        }
        if (fill.opacity !== void 0) {
          processedFill.opacity = fill.opacity;
        }
        return processedFill;
      });
    }
    if (node.strokes && node.strokes.length > 0) {
      filtered.strokes = node.strokes.map((stroke) => {
        const processedStroke = {
          type: stroke.type
        };
        if (stroke.color) {
          processedStroke.color = rgbaToHex(stroke.color);
        }
        if (stroke.opacity !== void 0) {
          processedStroke.opacity = stroke.opacity;
        }
        return processedStroke;
      });
    }
    if (node.cornerRadius !== void 0) {
      filtered.cornerRadius = node.cornerRadius;
    }
    if (node.absoluteBoundingBox) {
      filtered.absoluteBoundingBox = node.absoluteBoundingBox;
    }
    if (node.characters) {
      filtered.characters = node.characters;
    }
    if (node.style) {
      filtered.style = {
        fontFamily: node.style.fontFamily,
        fontStyle: node.style.fontStyle,
        fontWeight: node.style.fontWeight,
        fontSize: node.style.fontSize,
        textAlignHorizontal: node.style.textAlignHorizontal,
        letterSpacing: node.style.letterSpacing,
        lineHeightPx: node.style.lineHeightPx
      };
    }
    if (node.children) {
      filtered.children = node.children.map((child) => filterFigmaNode(child)).filter((child) => child !== null);
    }
    return filtered;
  }
  __name(filterFigmaNode, "filterFigmaNode");

  // src/figma-plugin/handlers/document.ts
  async function getDocumentInfo() {
    await figma.currentPage.loadAsync();
    const page = figma.currentPage;
    return {
      name: page.name,
      id: page.id,
      type: page.type,
      children: page.children.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type
      })),
      currentPage: {
        id: page.id,
        name: page.name,
        childCount: page.children.length
      },
      pages: [
        {
          id: page.id,
          name: page.name,
          childCount: page.children.length
        }
      ]
    };
  }
  __name(getDocumentInfo, "getDocumentInfo");
  async function getSelection() {
    return {
      selectionCount: figma.currentPage.selection.length,
      selection: figma.currentPage.selection.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        visible: node.visible
      }))
    };
  }
  __name(getSelection, "getSelection");
  async function readMyDesign() {
    try {
      const nodes = await Promise.all(
        figma.currentPage.selection.map((node) => figma.getNodeByIdAsync(node.id))
      );
      const validNodes = nodes.filter((node) => node !== null);
      const responses = await Promise.all(
        validNodes.map(async (node) => {
          const response = await node.exportAsync({
            format: "JSON_REST_V1"
          });
          return {
            nodeId: node.id,
            document: filterFigmaNode(response.document)
          };
        })
      );
      return responses;
    } catch (error) {
      throw new Error(`Error getting nodes info: ${error.message}`);
    }
  }
  __name(readMyDesign, "readMyDesign");
  async function getNodeInfo(params) {
    const { nodeId } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }
    const response = await node.exportAsync({
      format: "JSON_REST_V1"
    });
    return filterFigmaNode(response.document);
  }
  __name(getNodeInfo, "getNodeInfo");
  async function getNodesInfo(params) {
    const { nodeIds } = params;
    if (!nodeIds || !Array.isArray(nodeIds)) {
      throw new Error("Missing or invalid nodeIds parameter");
    }
    try {
      const nodes = await Promise.all(
        nodeIds.map((id) => figma.getNodeByIdAsync(id))
      );
      const validNodes = nodes.filter((node) => node !== null);
      const responses = await Promise.all(
        validNodes.map(async (node) => {
          const response = await node.exportAsync({
            format: "JSON_REST_V1"
          });
          return {
            nodeId: node.id,
            document: filterFigmaNode(response.document)
          };
        })
      );
      return responses;
    } catch (error) {
      throw new Error(`Error getting nodes info: ${error.message}`);
    }
  }
  __name(getNodesInfo, "getNodesInfo");
  async function setFocus(params) {
    const { nodeId } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }
    figma.currentPage.selection = [node];
    figma.viewport.scrollAndZoomIntoView([node]);
    return {
      id: node.id,
      name: node.name,
      type: node.type
    };
  }
  __name(setFocus, "setFocus");
  async function setSelections(params) {
    const { nodeIds } = params;
    if (!nodeIds || !Array.isArray(nodeIds)) {
      throw new Error("Missing or invalid nodeIds parameter");
    }
    const nodes = await Promise.all(
      nodeIds.map((id) => figma.getNodeByIdAsync(id))
    );
    const validNodes = nodes.filter((node) => node !== null);
    if (validNodes.length === 0) {
      throw new Error("No valid nodes found");
    }
    figma.currentPage.selection = validNodes;
    return {
      selectionCount: validNodes.length,
      selection: validNodes.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type
      }))
    };
  }
  __name(setSelections, "setSelections");

  // src/figma-plugin/utils/helpers.ts
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  __name(delay, "delay");
  function customBase64Encode(bytes) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let base64 = "";
    const byteLength = bytes.byteLength;
    const byteRemainder = byteLength % 3;
    const mainLength = byteLength - byteRemainder;
    let a, b, c, d;
    let chunk;
    for (let i = 0; i < mainLength; i = i + 3) {
      chunk = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
      a = (chunk & 16515072) >> 18;
      b = (chunk & 258048) >> 12;
      c = (chunk & 4032) >> 6;
      d = chunk & 63;
      base64 += chars[a] + chars[b] + chars[c] + chars[d];
    }
    if (byteRemainder === 1) {
      chunk = bytes[mainLength];
      a = (chunk & 252) >> 2;
      b = (chunk & 3) << 4;
      base64 += chars[a] + chars[b] + "==";
    } else if (byteRemainder === 2) {
      chunk = bytes[mainLength] << 8 | bytes[mainLength + 1];
      a = (chunk & 64512) >> 10;
      b = (chunk & 1008) >> 4;
      c = (chunk & 15) << 2;
      base64 += chars[a] + chars[b] + chars[c] + "=";
    }
    return base64;
  }
  __name(customBase64Encode, "customBase64Encode");
  function getFontStyleFromWeight(weight) {
    switch (weight) {
      case 100:
        return "Thin";
      case 200:
        return "Extra Light";
      case 300:
        return "Light";
      case 400:
        return "Regular";
      case 500:
        return "Medium";
      case 600:
        return "Semi Bold";
      case 700:
        return "Bold";
      case 800:
        return "Extra Bold";
      case 900:
        return "Black";
      default:
        return "Regular";
    }
  }
  __name(getFontStyleFromWeight, "getFontStyleFromWeight");
  async function getNodeById(nodeId) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }
    return node;
  }
  __name(getNodeById, "getNodeById");
  async function getContainerNode(parentId) {
    if (parentId) {
      const parentNode = await figma.getNodeByIdAsync(parentId);
      if (!parentNode) {
        throw new Error(`Parent node not found with ID: ${parentId}`);
      }
      if (!("appendChild" in parentNode)) {
        throw new Error(`Parent node does not support children: ${parentId}`);
      }
      return parentNode;
    }
    return figma.currentPage;
  }
  __name(getContainerNode, "getContainerNode");
  function assertNodeCapability(node, capability, errorMessage) {
    if (!(capability in node)) {
      throw new Error(errorMessage || `Node does not support ${capability}: ${node.id}`);
    }
  }
  __name(assertNodeCapability, "assertNodeCapability");

  // src/figma-plugin/utils/progress.ts
  function sendProgressUpdate(commandId, commandType, status, progress, totalItems, processedItems, message, payload = null) {
    const update = {
      type: "command_progress",
      commandId,
      commandType,
      status,
      progress,
      totalItems,
      processedItems,
      message,
      timestamp: Date.now()
    };
    if (payload) {
      if (payload.currentChunk !== void 0 && payload.totalChunks !== void 0) {
        update.currentChunk = payload.currentChunk;
        update.totalChunks = payload.totalChunks;
        update.chunkSize = payload.chunkSize;
      }
      update.payload = payload;
    }
    figma.ui.postMessage(update);
    console.log(`Progress update: ${status} - ${progress}% - ${message}`);
    return update;
  }
  __name(sendProgressUpdate, "sendProgressUpdate");
  function generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  __name(generateCommandId, "generateCommandId");

  // src/figma-plugin/handlers/text.ts
  async function setCharacters(node, characters, options) {
    const fallbackFont = options?.fallbackFont || { family: "Inter", style: "Regular" };
    try {
      if (node.fontName === figma.mixed) {
        if (options?.smartStrategy === "prevail") {
          const fontHashTree = {};
          for (let i = 1; i < node.characters.length; i++) {
            const charFont = node.getRangeFontName(i - 1, i);
            const key = `${charFont.family}::${charFont.style}`;
            fontHashTree[key] = fontHashTree[key] ? fontHashTree[key] + 1 : 1;
          }
          const prevailedTreeItem = Object.entries(fontHashTree).sort((a, b) => b[1] - a[1])[0];
          const [family, style] = prevailedTreeItem[0].split("::");
          const prevailedFont = { family, style };
          await figma.loadFontAsync(prevailedFont);
          node.fontName = prevailedFont;
        } else {
          const firstCharFont = node.getRangeFontName(0, 1);
          await figma.loadFontAsync(firstCharFont);
          node.fontName = firstCharFont;
        }
      } else {
        await figma.loadFontAsync(node.fontName);
      }
    } catch (err) {
      console.warn(`Failed to load font, using fallback`, err);
      await figma.loadFontAsync(fallbackFont);
      node.fontName = fallbackFont;
    }
    try {
      node.characters = characters;
      return true;
    } catch (err) {
      console.warn(`Failed to set characters`, err);
      return false;
    }
  }
  __name(setCharacters, "setCharacters");
  async function setTextContent(params) {
    const { nodeId, text } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (text === void 0) {
      throw new Error("Missing text parameter");
    }
    const node = await getNodeById(nodeId);
    if (node.type !== "TEXT") {
      throw new Error(`Node is not a text node: ${nodeId}`);
    }
    try {
      await figma.loadFontAsync(node.fontName);
      await setCharacters(node, text);
      return {
        id: node.id,
        name: node.name,
        characters: node.characters,
        fontName: node.fontName
      };
    } catch (error) {
      throw new Error(`Error setting text content: ${error.message}`);
    }
  }
  __name(setTextContent, "setTextContent");
  async function findTextNodes(node, parentPath = [], depth = 0, textNodes = []) {
    if (node.type === "TEXT") {
      const textNode = node;
      textNodes.push({
        nodeId: textNode.id,
        nodeName: textNode.name,
        characters: textNode.characters,
        path: parentPath,
        depth,
        fontSize: typeof textNode.fontSize === "number" ? textNode.fontSize : void 0,
        fontName: textNode.fontName !== figma.mixed ? textNode.fontName : void 0,
        hasMultipleFonts: textNode.fontName === figma.mixed,
        textStyleId: typeof textNode.textStyleId === "string" ? textNode.textStyleId : void 0
      });
    }
    if ("children" in node) {
      for (const child of node.children) {
        await findTextNodes(child, [...parentPath, node.name], depth + 1, textNodes);
      }
    }
    return textNodes;
  }
  __name(findTextNodes, "findTextNodes");
  async function scanTextNodes(params) {
    const { nodeId, depth: maxDepth, filter } = params || {};
    const commandId = generateCommandId();
    let rootNode;
    if (nodeId) {
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) {
        sendProgressUpdate(commandId, "scan_text_nodes", "error", 0, 0, 0, `Node not found: ${nodeId}`, { error: `Node not found: ${nodeId}` });
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      rootNode = node;
    } else {
      rootNode = figma.currentPage;
    }
    sendProgressUpdate(
      commandId,
      "scan_text_nodes",
      "started",
      0,
      1,
      0,
      `Starting scan of node "${rootNode.name}"`,
      null
    );
    const textNodes = [];
    await findTextNodes(rootNode, [], 0, textNodes);
    let filteredNodes = textNodes;
    if (filter) {
      const filterLower = filter.toLowerCase();
      filteredNodes = textNodes.filter(
        (n) => n.characters.toLowerCase().includes(filterLower) || n.nodeName.toLowerCase().includes(filterLower)
      );
    }
    if (maxDepth !== void 0) {
      filteredNodes = filteredNodes.filter((n) => n.depth <= maxDepth);
    }
    sendProgressUpdate(
      commandId,
      "scan_text_nodes",
      "completed",
      100,
      filteredNodes.length,
      filteredNodes.length,
      `Scan complete. Found ${filteredNodes.length} text nodes.`,
      { textNodes: filteredNodes }
    );
    return {
      success: true,
      message: `Scanned ${filteredNodes.length} text nodes.`,
      count: filteredNodes.length,
      textNodes: filteredNodes,
      commandId
    };
  }
  __name(scanTextNodes, "scanTextNodes");
  async function setMultipleTextContents(params) {
    const { updates } = params || {};
    const commandId = generateCommandId();
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      throw new Error("Missing or invalid updates parameter");
    }
    sendProgressUpdate(
      commandId,
      "set_multiple_text_contents",
      "started",
      0,
      updates.length,
      0,
      `Starting to update ${updates.length} text nodes`,
      { totalNodes: updates.length }
    );
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    const CHUNK_SIZE = 5;
    const chunks = [];
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      chunks.push(updates.slice(i, i + CHUNK_SIZE));
    }
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      sendProgressUpdate(
        commandId,
        "set_multiple_text_contents",
        "in_progress",
        Math.round(5 + chunkIndex / chunks.length * 90),
        updates.length,
        successCount + failureCount,
        `Processing chunk ${chunkIndex + 1}/${chunks.length}`,
        { currentChunk: chunkIndex + 1, totalChunks: chunks.length }
      );
      const chunkPromises = chunk.map(async ({ nodeId, text }) => {
        try {
          const node = await figma.getNodeByIdAsync(nodeId);
          if (!node) {
            return { success: false, nodeId, error: `Node not found: ${nodeId}` };
          }
          if (node.type !== "TEXT") {
            return { success: false, nodeId, error: `Node is not a text node: ${nodeId}` };
          }
          await figma.loadFontAsync(node.fontName);
          await setCharacters(node, text);
          return { success: true, nodeId, nodeName: node.name };
        } catch (error) {
          return { success: false, nodeId, error: error.message };
        }
      });
      const chunkResults = await Promise.all(chunkPromises);
      chunkResults.forEach((result) => {
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
        results.push(result);
      });
      if (chunkIndex < chunks.length - 1) {
        await delay(100);
      }
    }
    sendProgressUpdate(
      commandId,
      "set_multiple_text_contents",
      "completed",
      100,
      updates.length,
      successCount + failureCount,
      `Text update complete: ${successCount} successful, ${failureCount} failed`,
      { results }
    );
    return {
      success: successCount > 0,
      successCount,
      failureCount,
      totalNodes: updates.length,
      results,
      commandId
    };
  }
  __name(setMultipleTextContents, "setMultipleTextContents");

  // src/figma-plugin/handlers/creation.ts
  async function createRectangle(params) {
    const {
      x = 0,
      y = 0,
      width = 100,
      height = 100,
      name = "Rectangle",
      parentId
    } = params || {};
    const rect = figma.createRectangle();
    rect.x = x;
    rect.y = y;
    rect.resize(width, height);
    rect.name = name;
    const parent = await getContainerNode(parentId);
    parent.appendChild(rect);
    return {
      id: rect.id,
      name: rect.name,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      parentId: rect.parent?.id
    };
  }
  __name(createRectangle, "createRectangle");
  async function createFrame(params) {
    const {
      x = 0,
      y = 0,
      width = 100,
      height = 100,
      name = "Frame",
      parentId,
      fillColor,
      strokeColor,
      strokeWeight,
      layoutMode = "NONE",
      layoutWrap = "NO_WRAP",
      paddingTop = 10,
      paddingRight = 10,
      paddingBottom = 10,
      paddingLeft = 10,
      primaryAxisAlignItems = "MIN",
      counterAxisAlignItems = "MIN",
      layoutSizingHorizontal = "FIXED",
      layoutSizingVertical = "FIXED",
      itemSpacing = 0
    } = params || {};
    const frame = figma.createFrame();
    frame.x = x;
    frame.y = y;
    frame.resize(width, height);
    frame.name = name;
    if (layoutMode !== "NONE") {
      frame.layoutMode = layoutMode;
      frame.layoutWrap = layoutWrap;
      frame.paddingTop = paddingTop;
      frame.paddingRight = paddingRight;
      frame.paddingBottom = paddingBottom;
      frame.paddingLeft = paddingLeft;
      frame.primaryAxisAlignItems = primaryAxisAlignItems;
      frame.counterAxisAlignItems = counterAxisAlignItems;
      frame.layoutSizingHorizontal = layoutSizingHorizontal;
      frame.layoutSizingVertical = layoutSizingVertical;
      frame.itemSpacing = itemSpacing;
    }
    if (fillColor) {
      frame.fills = [{
        type: "SOLID",
        color: {
          r: fillColor.r ?? 0,
          g: fillColor.g ?? 0,
          b: fillColor.b ?? 0
        },
        opacity: fillColor.a ?? 1
      }];
    }
    if (strokeColor) {
      frame.strokes = [{
        type: "SOLID",
        color: {
          r: strokeColor.r ?? 0,
          g: strokeColor.g ?? 0,
          b: strokeColor.b ?? 0
        },
        opacity: strokeColor.a ?? 1
      }];
    }
    if (strokeWeight !== void 0) {
      frame.strokeWeight = strokeWeight;
    }
    const parent = await getContainerNode(parentId);
    parent.appendChild(frame);
    return {
      id: frame.id,
      name: frame.name,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      fills: frame.fills,
      strokes: frame.strokes,
      strokeWeight: frame.strokeWeight,
      layoutMode: frame.layoutMode,
      layoutWrap: frame.layoutWrap,
      parentId: frame.parent?.id
    };
  }
  __name(createFrame, "createFrame");
  async function createText(params) {
    const {
      x = 0,
      y = 0,
      text = "Text",
      fontSize = 14,
      fontWeight = 400,
      fontColor = { r: 0, g: 0, b: 0, a: 1 },
      name = "",
      parentId
    } = params || {};
    const fontStyle = getFontStyleFromWeight(fontWeight);
    const textNode = figma.createText();
    textNode.x = x;
    textNode.y = y;
    textNode.name = name || text;
    try {
      await figma.loadFontAsync({
        family: "Inter",
        style: fontStyle
      });
      textNode.fontName = { family: "Inter", style: fontStyle };
      textNode.fontSize = fontSize;
    } catch (error) {
      console.error("Error setting font size", error);
    }
    await setCharacters(textNode, text);
    textNode.fills = [{
      type: "SOLID",
      color: {
        r: fontColor.r ?? 0,
        g: fontColor.g ?? 0,
        b: fontColor.b ?? 0
      },
      opacity: fontColor.a ?? 1
    }];
    const parent = await getContainerNode(parentId);
    parent.appendChild(textNode);
    return {
      id: textNode.id,
      name: textNode.name,
      x: textNode.x,
      y: textNode.y,
      width: textNode.width,
      height: textNode.height,
      characters: textNode.characters,
      fontSize: textNode.fontSize,
      fontWeight,
      fontColor,
      fontName: textNode.fontName,
      fills: textNode.fills,
      parentId: textNode.parent?.id
    };
  }
  __name(createText, "createText");

  // src/figma-plugin/handlers/styling.ts
  async function setFillColor(params) {
    const { nodeId, color } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (!color) {
      throw new Error("Missing color parameter");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "fills", `Node does not support fills: ${nodeId}`);
    const paintStyle = {
      type: "SOLID",
      color: {
        r: color.r ?? 0,
        g: color.g ?? 0,
        b: color.b ?? 0
      },
      opacity: color.a ?? 1
    };
    node.fills = [paintStyle];
    return {
      id: node.id,
      name: node.name,
      fills: [paintStyle]
    };
  }
  __name(setFillColor, "setFillColor");
  async function setStrokeColor(params) {
    const { nodeId, color, weight = 1 } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (!color) {
      throw new Error("Missing color parameter");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "strokes", `Node does not support strokes: ${nodeId}`);
    const paintStyle = {
      type: "SOLID",
      color: {
        r: color.r ?? 0,
        g: color.g ?? 0,
        b: color.b ?? 0
      },
      opacity: color.a ?? 1
    };
    const strokableNode = node;
    strokableNode.strokes = [paintStyle];
    if ("strokeWeight" in node) {
      node.strokeWeight = weight;
    }
    return {
      id: node.id,
      name: node.name,
      strokes: strokableNode.strokes,
      strokeWeight: "strokeWeight" in node ? node.strokeWeight : void 0
    };
  }
  __name(setStrokeColor, "setStrokeColor");
  async function setCornerRadius(params) {
    const { nodeId, radius, topLeftRadius, topRightRadius, bottomLeftRadius, bottomRightRadius } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const hasAnyRadius = radius !== void 0 || topLeftRadius !== void 0 || topRightRadius !== void 0 || bottomLeftRadius !== void 0 || bottomRightRadius !== void 0;
    if (!hasAnyRadius) {
      throw new Error("Missing radius parameter");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "cornerRadius", `Node does not support corner radius: ${nodeId}`);
    const cornerNode = node;
    if (topLeftRadius !== void 0 || topRightRadius !== void 0 || bottomLeftRadius !== void 0 || bottomRightRadius !== void 0) {
      if ("topLeftRadius" in cornerNode) {
        if (topLeftRadius !== void 0) cornerNode.topLeftRadius = topLeftRadius;
        if (topRightRadius !== void 0) cornerNode.topRightRadius = topRightRadius;
        if (bottomRightRadius !== void 0) cornerNode.bottomRightRadius = bottomRightRadius;
        if (bottomLeftRadius !== void 0) cornerNode.bottomLeftRadius = bottomLeftRadius;
      } else {
        cornerNode.cornerRadius = radius ?? 0;
      }
    } else if (radius !== void 0) {
      cornerNode.cornerRadius = radius;
    }
    return {
      id: node.id,
      name: node.name,
      cornerRadius: "cornerRadius" in cornerNode ? cornerNode.cornerRadius : void 0,
      topLeftRadius: "topLeftRadius" in cornerNode ? cornerNode.topLeftRadius : void 0,
      topRightRadius: "topRightRadius" in cornerNode ? cornerNode.topRightRadius : void 0,
      bottomRightRadius: "bottomRightRadius" in cornerNode ? cornerNode.bottomRightRadius : void 0,
      bottomLeftRadius: "bottomLeftRadius" in cornerNode ? cornerNode.bottomLeftRadius : void 0
    };
  }
  __name(setCornerRadius, "setCornerRadius");

  // src/figma-plugin/handlers/layout.ts
  async function moveNode(params) {
    const { nodeId, x, y } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (x === void 0 || y === void 0) {
      throw new Error("Missing x or y parameters");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "x", `Node does not support position: ${nodeId}`);
    node.x = x;
    node.y = y;
    return {
      id: node.id,
      name: node.name,
      x: node.x,
      y: node.y
    };
  }
  __name(moveNode, "moveNode");
  async function resizeNode(params) {
    const { nodeId, width, height } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (width === void 0 || height === void 0) {
      throw new Error("Missing width or height parameters");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "resize", `Node does not support resizing: ${nodeId}`);
    node.resize(width, height);
    return {
      id: node.id,
      name: node.name,
      width: node.width,
      height: node.height
    };
  }
  __name(resizeNode, "resizeNode");
  async function deleteNode(params) {
    const { nodeId } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const node = await getNodeById(nodeId);
    const nodeInfo = {
      id: node.id,
      name: node.name,
      type: node.type
    };
    node.remove();
    return nodeInfo;
  }
  __name(deleteNode, "deleteNode");
  async function deleteMultipleNodes(params) {
    const { nodeIds } = params || {};
    const commandId = generateCommandId();
    if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      const errorMsg = "Missing or invalid nodeIds parameter";
      sendProgressUpdate(commandId, "delete_multiple_nodes", "error", 0, 0, 0, errorMsg, { error: errorMsg });
      throw new Error(errorMsg);
    }
    sendProgressUpdate(
      commandId,
      "delete_multiple_nodes",
      "started",
      0,
      nodeIds.length,
      0,
      `Starting deletion of ${nodeIds.length} nodes`,
      { totalNodes: nodeIds.length }
    );
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    const CHUNK_SIZE = 5;
    const chunks = [];
    for (let i = 0; i < nodeIds.length; i += CHUNK_SIZE) {
      chunks.push(nodeIds.slice(i, i + CHUNK_SIZE));
    }
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      sendProgressUpdate(
        commandId,
        "delete_multiple_nodes",
        "in_progress",
        Math.round(5 + chunkIndex / chunks.length * 90),
        nodeIds.length,
        successCount + failureCount,
        `Processing deletion chunk ${chunkIndex + 1}/${chunks.length}`,
        { currentChunk: chunkIndex + 1, totalChunks: chunks.length, successCount, failureCount }
      );
      const chunkPromises = chunk.map(async (nodeId) => {
        try {
          const node = await figma.getNodeByIdAsync(nodeId);
          if (!node) {
            return { success: false, nodeId, error: `Node not found: ${nodeId}` };
          }
          const nodeInfo = {
            id: node.id,
            name: node.name,
            type: node.type
          };
          node.remove();
          return { success: true, nodeId, nodeInfo };
        } catch (error) {
          return { success: false, nodeId, error: error.message };
        }
      });
      const chunkResults = await Promise.all(chunkPromises);
      chunkResults.forEach((result) => {
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
        results.push(result);
      });
      if (chunkIndex < chunks.length - 1) {
        await delay(100);
      }
    }
    sendProgressUpdate(
      commandId,
      "delete_multiple_nodes",
      "completed",
      100,
      nodeIds.length,
      successCount + failureCount,
      `Node deletion complete: ${successCount} successful, ${failureCount} failed`,
      { totalNodes: nodeIds.length, nodesDeleted: successCount, nodesFailed: failureCount, results }
    );
    return {
      success: successCount > 0,
      nodesDeleted: successCount,
      nodesFailed: failureCount,
      totalNodes: nodeIds.length,
      results,
      completedInChunks: chunks.length,
      commandId
    };
  }
  __name(deleteMultipleNodes, "deleteMultipleNodes");
  async function cloneNode(params) {
    const { nodeId, x, y } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const node = await getNodeById(nodeId);
    const clone = node.clone();
    if (x !== void 0 && y !== void 0) {
      if (!("x" in clone) || !("y" in clone)) {
        throw new Error(`Cloned node does not support position: ${nodeId}`);
      }
      clone.x = x;
      clone.y = y;
    }
    if (node.parent && "appendChild" in node.parent) {
      node.parent.appendChild(clone);
    } else {
      figma.currentPage.appendChild(clone);
    }
    return {
      id: clone.id,
      name: clone.name,
      x: "x" in clone ? clone.x : void 0,
      y: "y" in clone ? clone.y : void 0,
      width: "width" in clone ? clone.width : void 0,
      height: "height" in clone ? clone.height : void 0
    };
  }
  __name(cloneNode, "cloneNode");

  // src/figma-plugin/handlers/auto-layout.ts
  function assertAutoLayoutSupport(node) {
    const supportedTypes = ["FRAME", "COMPONENT", "COMPONENT_SET", "INSTANCE"];
    if (!supportedTypes.includes(node.type)) {
      throw new Error(`Node type ${node.type} does not support auto-layout`);
    }
  }
  __name(assertAutoLayoutSupport, "assertAutoLayoutSupport");
  function assertAutoLayoutEnabled(node) {
    if (node.layoutMode === "NONE") {
      throw new Error("This operation requires auto-layout to be enabled (layoutMode must not be NONE)");
    }
  }
  __name(assertAutoLayoutEnabled, "assertAutoLayoutEnabled");
  async function setLayoutMode(params) {
    const { nodeId, mode, layoutWrap = "NO_WRAP", itemSpacing } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const node = await getNodeById(nodeId);
    assertAutoLayoutSupport(node);
    node.layoutMode = mode;
    if (mode !== "NONE") {
      node.layoutWrap = layoutWrap;
      if (itemSpacing !== void 0) {
        node.itemSpacing = itemSpacing;
      }
    }
    return {
      id: node.id,
      name: node.name,
      layoutMode: node.layoutMode,
      layoutWrap: node.layoutWrap,
      itemSpacing: node.itemSpacing
    };
  }
  __name(setLayoutMode, "setLayoutMode");
  async function setPadding(params) {
    const { nodeId, paddingTop, paddingRight, paddingBottom, paddingLeft, padding } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const node = await getNodeById(nodeId);
    assertAutoLayoutSupport(node);
    assertAutoLayoutEnabled(node);
    if (padding !== void 0) {
      node.paddingTop = padding;
      node.paddingRight = padding;
      node.paddingBottom = padding;
      node.paddingLeft = padding;
    } else {
      if (paddingTop !== void 0) node.paddingTop = paddingTop;
      if (paddingRight !== void 0) node.paddingRight = paddingRight;
      if (paddingBottom !== void 0) node.paddingBottom = paddingBottom;
      if (paddingLeft !== void 0) node.paddingLeft = paddingLeft;
    }
    return {
      id: node.id,
      name: node.name,
      paddingTop: node.paddingTop,
      paddingRight: node.paddingRight,
      paddingBottom: node.paddingBottom,
      paddingLeft: node.paddingLeft
    };
  }
  __name(setPadding, "setPadding");
  async function setAxisAlign(params) {
    const { nodeId, primaryAxisAlignItems, counterAxisAlignItems } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const node = await getNodeById(nodeId);
    assertAutoLayoutSupport(node);
    assertAutoLayoutEnabled(node);
    if (primaryAxisAlignItems !== void 0) {
      const validPrimary = ["MIN", "MAX", "CENTER", "SPACE_BETWEEN"];
      if (!validPrimary.includes(primaryAxisAlignItems)) {
        throw new Error(`Invalid primaryAxisAlignItems value. Must be one of: ${validPrimary.join(", ")}`);
      }
      node.primaryAxisAlignItems = primaryAxisAlignItems;
    }
    if (counterAxisAlignItems !== void 0) {
      const validCounter = ["MIN", "MAX", "CENTER", "BASELINE"];
      if (!validCounter.includes(counterAxisAlignItems)) {
        throw new Error(`Invalid counterAxisAlignItems value. Must be one of: ${validCounter.join(", ")}`);
      }
      if (counterAxisAlignItems === "BASELINE" && node.layoutMode !== "HORIZONTAL") {
        throw new Error("BASELINE alignment is only valid for horizontal auto-layout frames");
      }
      node.counterAxisAlignItems = counterAxisAlignItems;
    }
    return {
      id: node.id,
      name: node.name,
      primaryAxisAlignItems: node.primaryAxisAlignItems,
      counterAxisAlignItems: node.counterAxisAlignItems,
      layoutMode: node.layoutMode
    };
  }
  __name(setAxisAlign, "setAxisAlign");
  async function setLayoutSizing(params) {
    const { nodeId, horizontal, vertical } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const node = await getNodeById(nodeId);
    assertAutoLayoutSupport(node);
    assertAutoLayoutEnabled(node);
    const validSizing = ["FIXED", "HUG", "FILL"];
    if (horizontal !== void 0) {
      if (!validSizing.includes(horizontal)) {
        throw new Error(`Invalid layoutSizingHorizontal value. Must be one of: ${validSizing.join(", ")}`);
      }
      if (horizontal === "HUG" && !["FRAME", "TEXT"].includes(node.type)) {
        throw new Error("HUG sizing is only valid on auto-layout frames and text nodes");
      }
      if (horizontal === "FILL" && (!node.parent || node.parent.layoutMode === "NONE")) {
        throw new Error("FILL sizing is only valid on auto-layout children");
      }
      node.layoutSizingHorizontal = horizontal;
    }
    if (vertical !== void 0) {
      if (!validSizing.includes(vertical)) {
        throw new Error(`Invalid layoutSizingVertical value. Must be one of: ${validSizing.join(", ")}`);
      }
      if (vertical === "HUG" && !["FRAME", "TEXT"].includes(node.type)) {
        throw new Error("HUG sizing is only valid on auto-layout frames and text nodes");
      }
      if (vertical === "FILL" && (!node.parent || node.parent.layoutMode === "NONE")) {
        throw new Error("FILL sizing is only valid on auto-layout children");
      }
      node.layoutSizingVertical = vertical;
    }
    return {
      id: node.id,
      name: node.name,
      layoutSizingHorizontal: node.layoutSizingHorizontal,
      layoutSizingVertical: node.layoutSizingVertical,
      layoutMode: node.layoutMode
    };
  }
  __name(setLayoutSizing, "setLayoutSizing");
  async function setItemSpacing(params) {
    const { nodeId, spacing } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (spacing === void 0) {
      throw new Error("Missing spacing parameter");
    }
    const node = await getNodeById(nodeId);
    assertAutoLayoutSupport(node);
    assertAutoLayoutEnabled(node);
    node.itemSpacing = spacing;
    return {
      id: node.id,
      name: node.name,
      itemSpacing: node.itemSpacing,
      layoutMode: node.layoutMode,
      layoutWrap: node.layoutWrap
    };
  }
  __name(setItemSpacing, "setItemSpacing");

  // src/figma-plugin/handlers/components.ts
  async function getStyles() {
    const styles = {
      colors: await figma.getLocalPaintStylesAsync(),
      texts: await figma.getLocalTextStylesAsync(),
      effects: await figma.getLocalEffectStylesAsync(),
      grids: await figma.getLocalGridStylesAsync()
    };
    return {
      colors: styles.colors.map((style) => ({
        id: style.id,
        name: style.name,
        key: style.key,
        paint: style.paints[0]
      })),
      texts: styles.texts.map((style) => ({
        id: style.id,
        name: style.name,
        key: style.key,
        fontSize: style.fontSize,
        fontName: style.fontName
      })),
      effects: styles.effects.map((style) => ({
        id: style.id,
        name: style.name,
        key: style.key
      })),
      grids: styles.grids.map((style) => ({
        id: style.id,
        name: style.name,
        key: style.key
      }))
    };
  }
  __name(getStyles, "getStyles");
  async function getLocalComponents() {
    await figma.loadAllPagesAsync();
    const components = figma.root.findAllWithCriteria({
      types: ["COMPONENT"]
    });
    return {
      count: components.length,
      components: components.map((component) => ({
        id: component.id,
        name: component.name,
        key: "key" in component ? component.key : null
      }))
    };
  }
  __name(getLocalComponents, "getLocalComponents");
  async function createComponentInstance(params) {
    const { componentKey, x = 0, y = 0, parentId } = params || {};
    if (!componentKey) {
      throw new Error("Missing componentKey parameter");
    }
    try {
      const component = await figma.importComponentByKeyAsync(componentKey);
      const instance = component.createInstance();
      instance.x = x;
      instance.y = y;
      if (parentId) {
        const parentNode = await figma.getNodeByIdAsync(parentId);
        if (parentNode && "appendChild" in parentNode) {
          parentNode.appendChild(instance);
        } else {
          figma.currentPage.appendChild(instance);
        }
      } else {
        figma.currentPage.appendChild(instance);
      }
      return {
        id: instance.id,
        name: instance.name,
        x: instance.x,
        y: instance.y,
        width: instance.width,
        height: instance.height,
        componentId: instance.mainComponent?.id
      };
    } catch (error) {
      throw new Error(`Error creating component instance: ${error.message}`);
    }
  }
  __name(createComponentInstance, "createComponentInstance");
  async function getInstanceOverrides(params) {
    const { instanceNodeId } = params || {};
    let sourceInstance = null;
    if (instanceNodeId) {
      const node = await figma.getNodeByIdAsync(instanceNodeId);
      if (!node) {
        throw new Error(`Instance node not found with ID: ${instanceNodeId}`);
      }
      if (node.type !== "INSTANCE") {
        return { success: false, message: "Provided node is not a component instance" };
      }
      sourceInstance = node;
    } else {
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        return { success: false, message: "No nodes selected" };
      }
      const instances = selection.filter((node) => node.type === "INSTANCE");
      if (instances.length === 0) {
        return { success: false, message: "No instances found in selection" };
      }
      sourceInstance = instances[0];
    }
    try {
      const overrides = sourceInstance.overrides || [];
      const mainComponent = await sourceInstance.getMainComponentAsync();
      if (!mainComponent) {
        return { success: false, message: "Failed to get main component" };
      }
      return {
        success: true,
        message: `Got component information from "${sourceInstance.name}" for overrides.length: ${overrides.length}`,
        sourceInstanceId: sourceInstance.id,
        mainComponentId: mainComponent.id,
        overridesCount: overrides.length
      };
    } catch (error) {
      return { success: false, message: `Error: ${error.message}` };
    }
  }
  __name(getInstanceOverrides, "getInstanceOverrides");
  async function setInstanceOverrides(params) {
    const { targetNodeIds, sourceInstanceId, overrides } = params || {};
    if (!targetNodeIds || !Array.isArray(targetNodeIds) || targetNodeIds.length === 0) {
      return { success: false, message: "No target instances provided" };
    }
    const targetInstances = [];
    for (const id of targetNodeIds) {
      const node = await figma.getNodeByIdAsync(id);
      if (node && node.type === "INSTANCE") {
        targetInstances.push(node);
      }
    }
    if (targetInstances.length === 0) {
      return { success: false, message: "No valid instances found" };
    }
    if (sourceInstanceId) {
      const sourceNode = await figma.getNodeByIdAsync(sourceInstanceId);
      if (!sourceNode || sourceNode.type !== "INSTANCE") {
        return { success: false, message: "Source instance not found or is not an instance" };
      }
      const sourceInstance = sourceNode;
      const mainComponent = await sourceInstance.getMainComponentAsync();
      if (!mainComponent) {
        return { success: false, message: "Failed to get main component from source instance" };
      }
      const sourceOverrides = sourceInstance.overrides || [];
      const results = [];
      let totalAppliedCount = 0;
      for (const targetInstance of targetInstances) {
        try {
          targetInstance.swapComponent(mainComponent);
          let appliedCount = 0;
          for (const override of sourceOverrides) {
            if (!override.id || !override.overriddenFields || override.overriddenFields.length === 0) {
              continue;
            }
            const overrideNodeId = override.id.replace(sourceInstance.id, targetInstance.id);
            const overrideNode = await figma.getNodeByIdAsync(overrideNodeId);
            if (!overrideNode) continue;
            const sourceOverrideNode = await figma.getNodeByIdAsync(override.id);
            if (!sourceOverrideNode) continue;
            for (const field of override.overriddenFields) {
              try {
                if (field === "characters" && overrideNode.type === "TEXT") {
                  await figma.loadFontAsync(overrideNode.fontName);
                  overrideNode.characters = sourceOverrideNode.characters;
                  appliedCount++;
                } else if (field in overrideNode && field in sourceOverrideNode) {
                  overrideNode[field] = sourceOverrideNode[field];
                  appliedCount++;
                }
              } catch (e) {
                console.error(`Error applying field ${field}:`, e);
              }
            }
          }
          if (appliedCount > 0) {
            totalAppliedCount += appliedCount;
            results.push({ success: true, instanceId: targetInstance.id, instanceName: targetInstance.name, appliedCount });
          } else {
            results.push({ success: false, instanceId: targetInstance.id, instanceName: targetInstance.name, message: "No overrides applied" });
          }
        } catch (error) {
          results.push({ success: false, instanceId: targetInstance.id, instanceName: targetInstance.name, message: error.message });
        }
      }
      return {
        success: totalAppliedCount > 0,
        message: totalAppliedCount > 0 ? `Applied overrides to ${results.filter((r) => r.success).length} instances` : "No overrides applied to any instance",
        totalCount: totalAppliedCount,
        results
      };
    }
    if (overrides && overrides.length > 0) {
      return { success: false, message: "Direct override application not yet implemented" };
    }
    return { success: false, message: "No source instance ID or overrides provided" };
  }
  __name(setInstanceOverrides, "setInstanceOverrides");

  // src/figma-plugin/handlers/annotations.ts
  async function getAnnotations(params) {
    const { nodeId } = params || {};
    const commandId = generateCommandId();
    let rootNode;
    if (nodeId) {
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      rootNode = node;
    } else {
      rootNode = figma.currentPage;
    }
    const annotations = [];
    async function collectAnnotations(node) {
      if ("annotations" in node && Array.isArray(node.annotations)) {
        for (const annotation of node.annotations) {
          if (annotation.label) {
            annotations.push({
              nodeId: node.id,
              nodeName: node.name,
              label: annotation.label,
              labelText: annotation.label
            });
          }
        }
      }
      if ("children" in node) {
        for (const child of node.children) {
          await collectAnnotations(child);
        }
      }
    }
    __name(collectAnnotations, "collectAnnotations");
    await collectAnnotations(rootNode);
    return {
      success: true,
      count: annotations.length,
      annotations,
      commandId
    };
  }
  __name(getAnnotations, "getAnnotations");
  async function setAnnotation(params) {
    const { nodeId, label } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (!label) {
      throw new Error("Missing label parameter");
    }
    const node = await getNodeById(nodeId);
    if (!("annotations" in node)) {
      throw new Error(`Node does not support annotations: ${nodeId}`);
    }
    const annotationNode = node;
    annotationNode.annotations = [{ label }];
    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      label
    };
  }
  __name(setAnnotation, "setAnnotation");
  async function setMultipleAnnotations(params) {
    const { annotations } = params || {};
    const commandId = generateCommandId();
    if (!annotations || !Array.isArray(annotations) || annotations.length === 0) {
      throw new Error("Missing or invalid annotations parameter");
    }
    sendProgressUpdate(
      commandId,
      "set_multiple_annotations",
      "started",
      0,
      annotations.length,
      0,
      `Starting to set ${annotations.length} annotations`,
      { totalNodes: annotations.length }
    );
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    const CHUNK_SIZE = 5;
    const chunks = [];
    for (let i = 0; i < annotations.length; i += CHUNK_SIZE) {
      chunks.push(annotations.slice(i, i + CHUNK_SIZE));
    }
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const chunkPromises = chunk.map(async ({ nodeId, label }) => {
        try {
          const node = await figma.getNodeByIdAsync(nodeId);
          if (!node) {
            return { success: false, nodeId, error: `Node not found: ${nodeId}` };
          }
          if (!("annotations" in node)) {
            return { success: false, nodeId, error: `Node does not support annotations: ${nodeId}` };
          }
          const annotationNode = node;
          annotationNode.annotations = [{ label }];
          return { success: true, nodeId, nodeName: node.name };
        } catch (error) {
          return { success: false, nodeId, error: error.message };
        }
      });
      const chunkResults = await Promise.all(chunkPromises);
      chunkResults.forEach((result) => {
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
        results.push(result);
      });
      sendProgressUpdate(
        commandId,
        "set_multiple_annotations",
        "in_progress",
        Math.round((chunkIndex + 1) / chunks.length * 100),
        annotations.length,
        successCount + failureCount,
        `Processed ${successCount + failureCount}/${annotations.length} annotations`,
        { currentChunk: chunkIndex + 1, totalChunks: chunks.length }
      );
      if (chunkIndex < chunks.length - 1) {
        await delay(100);
      }
    }
    sendProgressUpdate(
      commandId,
      "set_multiple_annotations",
      "completed",
      100,
      annotations.length,
      successCount + failureCount,
      `Annotation update complete: ${successCount} successful, ${failureCount} failed`,
      { results }
    );
    return {
      success: successCount > 0,
      successCount,
      failureCount,
      totalNodes: annotations.length,
      results,
      commandId
    };
  }
  __name(setMultipleAnnotations, "setMultipleAnnotations");
  async function scanNodesByTypes(params) {
    const { types, parentNodeId, depth: maxDepth } = params || {};
    const commandId = generateCommandId();
    if (!types || !Array.isArray(types) || types.length === 0) {
      throw new Error("Missing or invalid types parameter");
    }
    let rootNode;
    if (parentNodeId) {
      const node = await figma.getNodeByIdAsync(parentNodeId);
      if (!node) {
        throw new Error(`Node not found: ${parentNodeId}`);
      }
      rootNode = node;
    } else {
      rootNode = figma.currentPage;
    }
    const matchingNodes = [];
    async function findNodes(node, path = [], currentDepth = 0) {
      if (maxDepth !== void 0 && currentDepth > maxDepth) {
        return;
      }
      if (types.includes(node.type)) {
        matchingNodes.push({
          id: node.id,
          name: node.name,
          type: node.type,
          depth: currentDepth,
          path
        });
      }
      if ("children" in node) {
        for (const child of node.children) {
          await findNodes(child, [...path, node.name], currentDepth + 1);
        }
      }
    }
    __name(findNodes, "findNodes");
    sendProgressUpdate(
      commandId,
      "scan_nodes_by_types",
      "started",
      0,
      1,
      0,
      `Scanning for nodes of types: ${types.join(", ")}`,
      { types }
    );
    await findNodes(rootNode);
    sendProgressUpdate(
      commandId,
      "scan_nodes_by_types",
      "completed",
      100,
      matchingNodes.length,
      matchingNodes.length,
      `Found ${matchingNodes.length} nodes matching types: ${types.join(", ")}`,
      { nodes: matchingNodes }
    );
    return {
      success: true,
      count: matchingNodes.length,
      nodes: matchingNodes,
      types,
      commandId
    };
  }
  __name(scanNodesByTypes, "scanNodesByTypes");

  // src/figma-plugin/handlers/prototyping.ts
  async function getReactions(params) {
    const { nodeIds } = params || {};
    const commandId = generateCommandId();
    let nodesToCheck = [];
    if (nodeIds && nodeIds.length > 0) {
      for (const id of nodeIds) {
        const node = await figma.getNodeByIdAsync(id);
        if (node) {
          nodesToCheck.push(node);
        }
      }
    } else {
      nodesToCheck = [...figma.currentPage.selection];
    }
    if (nodesToCheck.length === 0) {
      throw new Error("No nodes to check for reactions");
    }
    sendProgressUpdate(
      commandId,
      "get_reactions",
      "started",
      0,
      nodesToCheck.length,
      0,
      `Scanning ${nodesToCheck.length} nodes for reactions`,
      null
    );
    const results = [];
    async function collectReactions(node) {
      if ("reactions" in node && Array.isArray(node.reactions) && node.reactions.length > 0) {
        results.push({
          nodeId: node.id,
          nodeName: node.name,
          reactions: node.reactions.map((r) => ({
            trigger: r.trigger,
            action: r.action
          }))
        });
      }
      if ("children" in node) {
        for (const child of node.children) {
          await collectReactions(child);
        }
      }
    }
    __name(collectReactions, "collectReactions");
    for (let i = 0; i < nodesToCheck.length; i++) {
      await collectReactions(nodesToCheck[i]);
      sendProgressUpdate(
        commandId,
        "get_reactions",
        "in_progress",
        Math.round((i + 1) / nodesToCheck.length * 100),
        nodesToCheck.length,
        i + 1,
        `Checked ${i + 1}/${nodesToCheck.length} nodes`,
        null
      );
    }
    sendProgressUpdate(
      commandId,
      "get_reactions",
      "completed",
      100,
      nodesToCheck.length,
      nodesToCheck.length,
      `Found ${results.length} nodes with reactions`,
      { results }
    );
    return {
      nodesCount: nodesToCheck.length,
      nodesWithReactions: results.length,
      nodes: results,
      commandId
    };
  }
  __name(getReactions, "getReactions");
  async function setDefaultConnector(params) {
    const { connectorType, strokeColor, strokeWeight } = params || {};
    const connectorId = await figma.clientStorage.getAsync("defaultConnectorId");
    if (connectorId) {
      const existingConnector = await figma.getNodeByIdAsync(connectorId);
      if (existingConnector && existingConnector.type === "CONNECTOR") {
        return {
          success: true,
          message: `Default connector already set: ${connectorId}`,
          connectorId,
          exists: true
        };
      }
    }
    const connectors = figma.currentPage.findAllWithCriteria({ types: ["CONNECTOR"] });
    if (connectors.length > 0) {
      const foundConnector = connectors[0];
      await figma.clientStorage.setAsync("defaultConnectorId", foundConnector.id);
      return {
        success: true,
        message: `Automatically set default connector: ${foundConnector.id}`,
        connectorId: foundConnector.id,
        autoSelected: true
      };
    }
    throw new Error("No connector found in the current page. Please create a connector first.");
  }
  __name(setDefaultConnector, "setDefaultConnector");
  async function createConnections(params) {
    const { connections } = params || {};
    const commandId = generateCommandId();
    if (!connections || !Array.isArray(connections) || connections.length === 0) {
      throw new Error("Missing or invalid connections parameter");
    }
    const defaultConnectorId = await figma.clientStorage.getAsync("defaultConnectorId");
    let templateConnector = null;
    if (defaultConnectorId) {
      const node = await figma.getNodeByIdAsync(defaultConnectorId);
      if (node && node.type === "CONNECTOR") {
        templateConnector = node;
      }
    }
    sendProgressUpdate(
      commandId,
      "create_connections",
      "started",
      0,
      connections.length,
      0,
      `Creating ${connections.length} connections`,
      null
    );
    const results = [];
    for (let i = 0; i < connections.length; i++) {
      const { fromNodeId, toNodeId, label } = connections[i];
      try {
        const fromNode = await figma.getNodeByIdAsync(fromNodeId);
        const toNode = await figma.getNodeByIdAsync(toNodeId);
        if (!fromNode) {
          results.push({ success: false, fromNodeId, toNodeId, error: `From node not found: ${fromNodeId}` });
          continue;
        }
        if (!toNode) {
          results.push({ success: false, fromNodeId, toNodeId, error: `To node not found: ${toNodeId}` });
          continue;
        }
        const connector = figma.createConnector();
        connector.connectorStart = {
          endpointNodeId: fromNodeId,
          magnet: "AUTO"
        };
        connector.connectorEnd = {
          endpointNodeId: toNodeId,
          magnet: "AUTO"
        };
        if (templateConnector) {
          connector.connectorLineType = templateConnector.connectorLineType;
          connector.strokes = templateConnector.strokes;
          connector.strokeWeight = templateConnector.strokeWeight;
        }
        figma.currentPage.appendChild(connector);
        results.push({
          success: true,
          fromNodeId,
          toNodeId,
          connectorId: connector.id
        });
      } catch (error) {
        results.push({
          success: false,
          fromNodeId,
          toNodeId,
          error: error.message
        });
      }
      sendProgressUpdate(
        commandId,
        "create_connections",
        "in_progress",
        Math.round((i + 1) / connections.length * 100),
        connections.length,
        i + 1,
        `Created ${i + 1}/${connections.length} connections`,
        null
      );
    }
    const successCount = results.filter((r) => r.success).length;
    sendProgressUpdate(
      commandId,
      "create_connections",
      "completed",
      100,
      connections.length,
      connections.length,
      `Created ${successCount}/${connections.length} connections`,
      { results }
    );
    return {
      success: successCount > 0,
      successCount,
      failureCount: connections.length - successCount,
      totalConnections: connections.length,
      results,
      commandId
    };
  }
  __name(createConnections, "createConnections");

  // src/figma-plugin/handlers/export.ts
  async function exportNodeAsImage(params) {
    const { nodeId, format = "PNG", scale = 1 } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "exportAsync", `Node does not support exporting: ${nodeId}`);
    try {
      const exportNode = node;
      const settings = {
        format,
        constraint: { type: "SCALE", value: scale }
      };
      const bytes = await exportNode.exportAsync(settings);
      let mimeType;
      switch (format) {
        case "PNG":
          mimeType = "image/png";
          break;
        case "JPG":
          mimeType = "image/jpeg";
          break;
        case "SVG":
          mimeType = "image/svg+xml";
          break;
        case "PDF":
          mimeType = "application/pdf";
          break;
        default:
          mimeType = "application/octet-stream";
      }
      const base64 = customBase64Encode(bytes);
      return {
        nodeId,
        format,
        data: base64,
        size: {
          width: "width" in node ? node.width : 0,
          height: "height" in node ? node.height : 0
        }
      };
    } catch (error) {
      throw new Error(`Error exporting node as image: ${error.message}`);
    }
  }
  __name(exportNodeAsImage, "exportNodeAsImage");

  // src/figma-plugin/handlers/index.ts
  async function handleCommand(command, params) {
    switch (command) {
      // Document & Selection
      case "get_document_info":
        return await getDocumentInfo();
      case "get_selection":
        return await getSelection();
      case "read_my_design":
        return await readMyDesign();
      case "get_node_info":
        return await getNodeInfo(params);
      case "get_nodes_info":
        return await getNodesInfo(params);
      case "set_focus":
        return await setFocus(params);
      case "set_selections":
        return await setSelections(params);
      // Element Creation
      case "create_rectangle":
        return await createRectangle(params);
      case "create_frame":
        return await createFrame(params);
      case "create_text":
        return await createText(params);
      // Styling
      case "set_fill_color":
        return await setFillColor(params);
      case "set_stroke_color":
        return await setStrokeColor(params);
      case "set_corner_radius":
        return await setCornerRadius(params);
      // Layout
      case "move_node":
        return await moveNode(params);
      case "resize_node":
        return await resizeNode(params);
      case "delete_node":
        return await deleteNode(params);
      case "delete_multiple_nodes":
        return await deleteMultipleNodes(params);
      case "clone_node":
        return await cloneNode(params);
      // Auto Layout
      case "set_layout_mode":
        return await setLayoutMode(params);
      case "set_padding":
        return await setPadding(params);
      case "set_axis_align":
        return await setAxisAlign(params);
      case "set_layout_sizing":
        return await setLayoutSizing(params);
      case "set_item_spacing":
        return await setItemSpacing(params);
      // Components
      case "get_styles":
        return await getStyles();
      case "get_local_components":
        return await getLocalComponents();
      case "create_component_instance":
        return await createComponentInstance(params);
      case "get_instance_overrides":
        return await getInstanceOverrides(params);
      case "set_instance_overrides":
        return await setInstanceOverrides(params);
      // Text
      case "set_text_content":
        return await setTextContent(params);
      case "scan_text_nodes":
        return await scanTextNodes(params);
      case "set_multiple_text_contents":
        return await setMultipleTextContents(params);
      // Annotations
      case "get_annotations":
        return await getAnnotations(params);
      case "set_annotation":
        return await setAnnotation(params);
      case "set_multiple_annotations":
        return await setMultipleAnnotations(params);
      case "scan_nodes_by_types":
        return await scanNodesByTypes(params);
      // Prototyping
      case "get_reactions":
        return await getReactions(params);
      case "set_default_connector":
        return await setDefaultConnector(params);
      case "create_connections":
        return await createConnections(params);
      // Export
      case "export_node_as_image":
        return await exportNodeAsImage(params);
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }
  __name(handleCommand, "handleCommand");

  // src/figma-plugin/code.ts
  var state = {
    serverPort: 3055
  };
  figma.showUI(__html__, { width: 350, height: 450 });
  figma.ui.onmessage = async (msg) => {
    switch (msg.type) {
      case "update-settings":
        updateSettings(msg);
        break;
      case "notify":
        if (msg.message) {
          figma.notify(msg.message);
        }
        break;
      case "close-plugin":
        figma.closePlugin();
        break;
      case "execute-command":
        if (msg.command && msg.id) {
          try {
            const result = await handleCommand(msg.command, msg.params || {});
            figma.ui.postMessage({
              type: "command-result",
              id: msg.id,
              result
            });
          } catch (error) {
            figma.ui.postMessage({
              type: "command-error",
              id: msg.id,
              error: error instanceof Error ? error.message : "Error executing command"
            });
          }
        }
        break;
    }
  };
  figma.on("run", ({ command }) => {
    figma.ui.postMessage({ type: "auto-connect" });
  });
  function updateSettings(settings) {
    if (settings.serverPort) {
      state.serverPort = settings.serverPort;
    }
    figma.clientStorage.setAsync("settings", {
      serverPort: state.serverPort
    });
  }
  __name(updateSettings, "updateSettings");
  async function initializePlugin() {
    try {
      const savedSettings = await figma.clientStorage.getAsync("settings");
      if (savedSettings) {
        if (savedSettings.serverPort) {
          state.serverPort = savedSettings.serverPort;
        }
      }
      figma.ui.postMessage({
        type: "init-settings",
        settings: {
          serverPort: state.serverPort
        }
      });
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }
  __name(initializePlugin, "initializePlugin");
  initializePlugin();
})();
