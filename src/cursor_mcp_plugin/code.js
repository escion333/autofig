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
    if (!nodeId) {
      throw new Error("Node ID is required");
    }
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}. The node may have been deleted or the ID is invalid.`);
    }
    return node;
  }
  __name(getNodeById, "getNodeById");
  async function getContainerNode(parentId) {
    if (parentId) {
      const parentNode = await figma.getNodeByIdAsync(parentId);
      if (!parentNode) {
        throw new Error(`Parent node not found with ID: ${parentId}. The node may have been deleted or the ID is invalid.`);
      }
      if (!("appendChild" in parentNode)) {
        throw new Error(`Parent node "${parentNode.name}" (${parentNode.type}) does not support children: ${parentId}`);
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
        if (options?.smartStrategy === "prevail" && node.characters.length > 1) {
          const fontHashTree = {};
          for (let i = 1; i < node.characters.length; i++) {
            const charFont = node.getRangeFontName(i - 1, i);
            const key = `${charFont.family}::${charFont.style}`;
            fontHashTree[key] = fontHashTree[key] ? fontHashTree[key] + 1 : 1;
          }
          const entries = Object.entries(fontHashTree);
          if (entries.length > 0) {
            const prevailedTreeItem = entries.sort((a, b) => b[1] - a[1])[0];
            const [family, style] = prevailedTreeItem[0].split("::");
            const prevailedFont = { family, style };
            await figma.loadFontAsync(prevailedFont);
            node.fontName = prevailedFont;
          } else {
            await figma.loadFontAsync(fallbackFont);
            node.fontName = fallbackFont;
          }
        } else if (node.characters.length > 0) {
          const firstCharFont = node.getRangeFontName(0, 1);
          await figma.loadFontAsync(firstCharFont);
          node.fontName = firstCharFont;
        } else {
          await figma.loadFontAsync(fallbackFont);
          node.fontName = fallbackFont;
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
      const textNode = node;
      if (textNode.fontName !== figma.mixed) {
        await figma.loadFontAsync(textNode.fontName);
      }
      await setCharacters(textNode, text);
      return {
        id: node.id,
        name: node.name,
        characters: textNode.characters,
        fontName: textNode.fontName
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
          const textNode = node;
          if (textNode.fontName !== figma.mixed) {
            await figma.loadFontAsync(textNode.fontName);
          }
          await setCharacters(textNode, text);
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
  async function createEllipse(params) {
    const {
      x = 0,
      y = 0,
      width = 100,
      height = 100,
      name = "Ellipse",
      parentId,
      fillColor,
      strokeColor,
      strokeWeight
    } = params || {};
    const ellipse = figma.createEllipse();
    ellipse.x = x;
    ellipse.y = y;
    ellipse.resize(width, height);
    ellipse.name = name;
    if (fillColor) {
      ellipse.fills = [{
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
      ellipse.strokes = [{
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
      ellipse.strokeWeight = strokeWeight;
    }
    const parent = await getContainerNode(parentId);
    parent.appendChild(ellipse);
    return {
      id: ellipse.id,
      name: ellipse.name,
      x: ellipse.x,
      y: ellipse.y,
      width: ellipse.width,
      height: ellipse.height,
      fills: ellipse.fills,
      strokes: ellipse.strokes,
      strokeWeight: ellipse.strokeWeight,
      parentId: ellipse.parent?.id
    };
  }
  __name(createEllipse, "createEllipse");
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
      fontFamily = "Inter",
      fontStyle: customFontStyle,
      fontColor = { r: 0, g: 0, b: 0, a: 1 },
      name = "",
      parentId
    } = params || {};
    const fontStyle = customFontStyle || getFontStyleFromWeight(fontWeight);
    const textNode = figma.createText();
    textNode.x = x;
    textNode.y = y;
    textNode.name = name || text;
    try {
      await figma.loadFontAsync({
        family: fontFamily,
        style: fontStyle
      });
      textNode.fontName = { family: fontFamily, style: fontStyle };
      textNode.fontSize = fontSize;
    } catch (error) {
      console.error(`Error loading font "${fontFamily}" with style "${fontStyle}", falling back to Inter:`, error);
      try {
        const fallbackStyle = getFontStyleFromWeight(fontWeight);
        await figma.loadFontAsync({
          family: "Inter",
          style: fallbackStyle
        });
        textNode.fontName = { family: "Inter", style: fallbackStyle };
        textNode.fontSize = fontSize;
      } catch (fallbackError) {
        console.error("Error loading fallback font:", fallbackError);
      }
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
      fontFamily,
      fontStyle,
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
    assertNodeCapability(node, "fills", `Node "${node.name}" (${node.type}) does not support fills: ${nodeId}`);
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
    assertNodeCapability(node, "strokes", `Node "${node.name}" (${node.type}) does not support strokes: ${nodeId}`);
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
    assertNodeCapability(node, "cornerRadius", `Node "${node.name}" (${node.type}) does not support corner radius: ${nodeId}`);
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
  async function setOpacity(params) {
    const { nodeId, opacity } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (opacity === void 0 || opacity === null) {
      throw new Error("Missing opacity parameter");
    }
    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "opacity", `Node "${node.name}" does not support opacity: ${nodeId}`);
    node.opacity = clampedOpacity;
    return {
      id: node.id,
      name: node.name,
      opacity: clampedOpacity
    };
  }
  __name(setOpacity, "setOpacity");

  // src/figma-plugin/handlers/organization.ts
  async function groupNodes(params) {
    const { nodeIds, name = "Group" } = params || {};
    if (!nodeIds || nodeIds.length === 0) {
      throw new Error("Missing nodeIds parameter - at least one node ID is required");
    }
    if (nodeIds.length < 2) {
      throw new Error("At least two nodes are required to create a group");
    }
    const nodes = [];
    for (const nodeId of nodeIds) {
      const node = await getNodeById(nodeId);
      nodes.push(node);
    }
    const firstParent = nodes[0].parent;
    if (!firstParent) {
      throw new Error(`Node "${nodes[0].name}" has no parent and cannot be grouped`);
    }
    for (let i = 1; i < nodes.length; i++) {
      if (nodes[i].parent !== firstParent) {
        throw new Error(
          `All nodes must have the same parent to be grouped. Node "${nodes[0].name}" has parent "${firstParent.name || firstParent.id}", but node "${nodes[i].name}" has parent "${nodes[i].parent?.name || nodes[i].parent?.id || "none"}"`
        );
      }
    }
    const group = figma.group(nodes, firstParent);
    group.name = name;
    return {
      id: group.id,
      name: group.name,
      type: group.type,
      x: group.x,
      y: group.y,
      width: group.width,
      height: group.height,
      childCount: group.children.length,
      parentId: group.parent?.id
    };
  }
  __name(groupNodes, "groupNodes");
  async function ungroupNode(params) {
    const { nodeId } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const node = await getNodeById(nodeId);
    if (node.type !== "GROUP") {
      throw new Error(`Node "${node.name}" (${node.type}) is not a group and cannot be ungrouped: ${nodeId}`);
    }
    const group = node;
    const parent = group.parent;
    if (!parent || !("appendChild" in parent)) {
      throw new Error(`Group "${group.name}" has no valid parent to move children to`);
    }
    const children = [...group.children];
    const ungroupedNodes = [];
    const groupIndex = parent.children.indexOf(group);
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      parent.insertChild(groupIndex, child);
      ungroupedNodes.unshift({
        id: child.id,
        name: child.name,
        type: child.type,
        x: child.x,
        y: child.y,
        width: child.width,
        height: child.height,
        parentId: parent.id
      });
    }
    if (group.children.length === 0 && group.parent) {
      group.remove();
    }
    return {
      ungroupedNodes
    };
  }
  __name(ungroupNode, "ungroupNode");

  // src/figma-plugin/handlers/variables.ts
  async function getLocalVariableCollections() {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const collectionInfos = collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      modes: collection.modes.map((mode) => ({
        modeId: mode.modeId,
        name: mode.name
      })),
      defaultModeId: collection.defaultModeId,
      variableIds: collection.variableIds,
      hiddenFromPublishing: collection.hiddenFromPublishing
    }));
    return {
      collections: collectionInfos,
      count: collectionInfos.length
    };
  }
  __name(getLocalVariableCollections, "getLocalVariableCollections");
  async function getLocalVariables(params) {
    const { collectionId } = params || {};
    const variables = await figma.variables.getLocalVariablesAsync();
    const filteredVariables = collectionId ? variables.filter((v) => v.variableCollectionId === collectionId) : variables;
    const variableInfos = filteredVariables.map((variable) => {
      const valuesByMode = {};
      for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
        if (isVariableAlias(value)) {
          valuesByMode[modeId] = {
            type: "VARIABLE_ALIAS",
            id: value.id
          };
        } else if (isRGBA(value)) {
          valuesByMode[modeId] = {
            r: value.r,
            g: value.g,
            b: value.b,
            a: value.a
          };
        } else {
          valuesByMode[modeId] = value;
        }
      }
      return {
        id: variable.id,
        name: variable.name,
        key: variable.key,
        variableCollectionId: variable.variableCollectionId,
        resolvedType: variable.resolvedType,
        valuesByMode,
        hiddenFromPublishing: variable.hiddenFromPublishing,
        scopes: [...variable.scopes],
        codeSyntax: { ...variable.codeSyntax }
      };
    });
    return {
      variables: variableInfos,
      count: variableInfos.length
    };
  }
  __name(getLocalVariables, "getLocalVariables");
  function isVariableAlias(value) {
    return typeof value === "object" && value !== null && "type" in value && value.type === "VARIABLE_ALIAS";
  }
  __name(isVariableAlias, "isVariableAlias");
  function isRGBA(value) {
    return typeof value === "object" && value !== null && "r" in value && "g" in value && "b" in value;
  }
  __name(isRGBA, "isRGBA");
  async function createVariableCollection(params) {
    const { name, modes } = params;
    if (!name) {
      throw new Error("Missing name parameter");
    }
    const collection = figma.variables.createVariableCollection(name);
    if (modes && modes.length > 0) {
      const defaultMode = collection.modes[0];
      collection.renameMode(defaultMode.modeId, modes[0]);
      for (let i = 1; i < modes.length; i++) {
        collection.addMode(modes[i]);
      }
    }
    return {
      id: collection.id,
      name: collection.name,
      modes: collection.modes.map((mode) => ({
        modeId: mode.modeId,
        name: mode.name
      })),
      defaultModeId: collection.defaultModeId,
      variableIds: collection.variableIds,
      hiddenFromPublishing: collection.hiddenFromPublishing
    };
  }
  __name(createVariableCollection, "createVariableCollection");
  async function createVariable(params) {
    const { collectionId, name, resolvedType, value } = params;
    if (!collectionId) {
      throw new Error("Missing collectionId parameter");
    }
    if (!name) {
      throw new Error("Missing name parameter");
    }
    if (!resolvedType) {
      throw new Error("Missing resolvedType parameter");
    }
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }
    const variable = figma.variables.createVariable(name, collectionId, resolvedType);
    if (value !== void 0) {
      const defaultModeId = collection.defaultModeId;
      const figmaValue = convertToFigmaValue(value, resolvedType);
      variable.setValueForMode(defaultModeId, figmaValue);
    }
    const valuesByMode = {};
    for (const [modeId, val] of Object.entries(variable.valuesByMode)) {
      valuesByMode[modeId] = serializeVariableValue(val);
    }
    return {
      id: variable.id,
      name: variable.name,
      key: variable.key,
      variableCollectionId: variable.variableCollectionId,
      resolvedType: variable.resolvedType,
      valuesByMode,
      hiddenFromPublishing: variable.hiddenFromPublishing,
      scopes: [...variable.scopes],
      codeSyntax: { ...variable.codeSyntax }
    };
  }
  __name(createVariable, "createVariable");
  async function setVariableValue(params) {
    const { variableId, modeId, value } = params;
    if (!variableId) {
      throw new Error("Missing variableId parameter");
    }
    if (!modeId) {
      throw new Error("Missing modeId parameter");
    }
    if (value === void 0) {
      throw new Error("Missing value parameter");
    }
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    if (!variable) {
      throw new Error(`Variable not found: ${variableId}`);
    }
    const figmaValue = convertToFigmaValue(value, variable.resolvedType);
    variable.setValueForMode(modeId, figmaValue);
    const valuesByMode = {};
    for (const [mode, val] of Object.entries(variable.valuesByMode)) {
      valuesByMode[mode] = serializeVariableValue(val);
    }
    return {
      id: variable.id,
      name: variable.name,
      key: variable.key,
      variableCollectionId: variable.variableCollectionId,
      resolvedType: variable.resolvedType,
      valuesByMode,
      hiddenFromPublishing: variable.hiddenFromPublishing,
      scopes: [...variable.scopes],
      codeSyntax: { ...variable.codeSyntax }
    };
  }
  __name(setVariableValue, "setVariableValue");
  async function deleteVariable(params) {
    const { variableId } = params;
    if (!variableId) {
      throw new Error("Missing variableId parameter");
    }
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    if (!variable) {
      throw new Error(`Variable not found: ${variableId}`);
    }
    variable.remove();
    return {
      success: true,
      variableId
    };
  }
  __name(deleteVariable, "deleteVariable");
  async function getBoundVariables(params) {
    const { nodeId } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    const boundVariables = {};
    if ("boundVariables" in node && node.boundVariables) {
      for (const [field, bindings] of Object.entries(node.boundVariables)) {
        if (bindings) {
          const bindingArray = Array.isArray(bindings) ? bindings : [bindings];
          boundVariables[field] = await Promise.all(
            bindingArray.map(async (binding) => {
              const variable = await figma.variables.getVariableByIdAsync(binding.id);
              return {
                variableId: binding.id,
                variableName: variable?.name
              };
            })
          );
        }
      }
    }
    return {
      nodeId,
      boundVariables
    };
  }
  __name(getBoundVariables, "getBoundVariables");
  async function bindVariable(params) {
    const { nodeId, field, variableId } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (!field) {
      throw new Error("Missing field parameter");
    }
    if (!variableId) {
      throw new Error("Missing variableId parameter");
    }
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    if (!variable) {
      throw new Error(`Variable not found: ${variableId}`);
    }
    if (!("setBoundVariable" in node)) {
      throw new Error(`Node type ${node.type} does not support variable binding`);
    }
    const bindableNode = node;
    bindableNode.setBoundVariable(field, variable);
    return {
      success: true,
      nodeId,
      field,
      variableId
    };
  }
  __name(bindVariable, "bindVariable");
  async function unbindVariable(params) {
    const { nodeId, field } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (!field) {
      throw new Error("Missing field parameter");
    }
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    if (!("setBoundVariable" in node)) {
      throw new Error(`Node type ${node.type} does not support variable binding`);
    }
    const bindableNode = node;
    bindableNode.setBoundVariable(field, null);
    return {
      success: true,
      nodeId,
      field
    };
  }
  __name(unbindVariable, "unbindVariable");
  function convertToFigmaValue(value, resolvedType) {
    if (resolvedType === "COLOR") {
      if (typeof value === "object" && "r" in value) {
        return {
          r: value.r,
          g: value.g,
          b: value.b,
          a: value.a ?? 1
        };
      }
      throw new Error("COLOR variable requires an RGBA object");
    }
    if (resolvedType === "FLOAT") {
      if (typeof value === "number") {
        return value;
      }
      throw new Error("FLOAT variable requires a number");
    }
    if (resolvedType === "STRING") {
      if (typeof value === "string") {
        return value;
      }
      throw new Error("STRING variable requires a string");
    }
    if (resolvedType === "BOOLEAN") {
      if (typeof value === "boolean") {
        return value;
      }
      throw new Error("BOOLEAN variable requires a boolean");
    }
    return value;
  }
  __name(convertToFigmaValue, "convertToFigmaValue");
  function serializeVariableValue(value) {
    if (isVariableAlias(value)) {
      return {
        type: "VARIABLE_ALIAS",
        id: value.id
      };
    }
    if (isRGBA(value)) {
      return {
        r: value.r,
        g: value.g,
        b: value.b,
        a: value.a
      };
    }
    return value;
  }
  __name(serializeVariableValue, "serializeVariableValue");

  // src/figma-plugin/handlers/typography.ts
  async function getAvailableFonts(params) {
    const { filter } = params || {};
    const fonts = await figma.listAvailableFontsAsync();
    const fontMap = /* @__PURE__ */ new Map();
    for (const font of fonts) {
      const family = font.fontName.family;
      const style = font.fontName.style;
      if (filter) {
        const filterLower = filter.toLowerCase();
        if (!family.toLowerCase().includes(filterLower)) {
          continue;
        }
      }
      if (!fontMap.has(family)) {
        fontMap.set(family, /* @__PURE__ */ new Set());
      }
      fontMap.get(family).add(style);
    }
    const result = [];
    for (const [family, styles] of fontMap.entries()) {
      result.push({
        family,
        styles: Array.from(styles).sort()
      });
    }
    result.sort((a, b) => a.family.localeCompare(b.family));
    return {
      fonts: result
    };
  }
  __name(getAvailableFonts, "getAvailableFonts");
  async function loadFont(params) {
    const { family, style = "Regular" } = params || {};
    if (!family) {
      throw new Error("Missing family parameter");
    }
    try {
      await figma.loadFontAsync({ family, style });
      return {
        success: true,
        family,
        style
      };
    } catch (error) {
      throw new Error(`Failed to load font "${family}" with style "${style}": ${error.message}`);
    }
  }
  __name(loadFont, "loadFont");
  async function getTextStyles() {
    const styles = figma.getLocalTextStyles();
    return {
      styles: styles.map((style) => ({
        id: style.id,
        name: style.name,
        fontFamily: style.fontName.family,
        fontStyle: style.fontName.style,
        fontSize: style.fontSize
      }))
    };
  }
  __name(getTextStyles, "getTextStyles");
  async function createTextStyle(params) {
    const {
      name,
      fontFamily = "Inter",
      fontStyle = "Regular",
      fontSize = 14,
      letterSpacing,
      lineHeight,
      paragraphSpacing,
      textCase,
      textDecoration
    } = params || {};
    if (!name) {
      throw new Error("Missing name parameter");
    }
    try {
      await figma.loadFontAsync({ family: fontFamily, style: fontStyle });
    } catch (error) {
      throw new Error(`Failed to load font "${fontFamily}" with style "${fontStyle}": ${error.message}`);
    }
    const style = figma.createTextStyle();
    style.name = name;
    style.fontName = { family: fontFamily, style: fontStyle };
    style.fontSize = fontSize;
    if (letterSpacing !== void 0) {
      style.letterSpacing = { value: letterSpacing, unit: "PIXELS" };
    }
    if (lineHeight !== void 0) {
      if (lineHeight === "AUTO") {
        style.lineHeight = { unit: "AUTO" };
      } else {
        style.lineHeight = { value: lineHeight, unit: "PIXELS" };
      }
    }
    if (paragraphSpacing !== void 0) {
      style.paragraphSpacing = paragraphSpacing;
    }
    if (textCase !== void 0) {
      style.textCase = textCase;
    }
    if (textDecoration !== void 0) {
      style.textDecoration = textDecoration;
    }
    return {
      id: style.id,
      name: style.name,
      fontFamily: style.fontName.family,
      fontStyle: style.fontName.style,
      fontSize: style.fontSize
    };
  }
  __name(createTextStyle, "createTextStyle");
  async function applyTextStyle(params) {
    const { nodeId, styleId, styleName } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (!styleId && !styleName) {
      throw new Error("Either styleId or styleName must be provided");
    }
    const node = await getNodeById(nodeId);
    if (node.type !== "TEXT") {
      throw new Error(`Node "${node.name}" (${node.type}) is not a text node: ${nodeId}`);
    }
    const textNode = node;
    let style;
    if (styleId) {
      style = figma.getStyleById(styleId);
      if (!style || style.type !== "TEXT") {
        throw new Error(`Text style not found with ID: ${styleId}`);
      }
    } else if (styleName) {
      const styles = figma.getLocalTextStyles();
      style = styles.find((s) => s.name === styleName);
      if (!style) {
        throw new Error(`Text style not found with name: "${styleName}"`);
      }
    }
    await figma.loadFontAsync(style.fontName);
    textNode.textStyleId = style.id;
    return {
      id: textNode.id,
      name: textNode.name,
      textStyleId: textNode.textStyleId,
      textStyleName: style.name
    };
  }
  __name(applyTextStyle, "applyTextStyle");
  async function setTextProperties(params) {
    const {
      nodeId,
      fontFamily,
      fontStyle,
      fontSize,
      letterSpacing,
      lineHeight,
      paragraphSpacing,
      textCase,
      textDecoration,
      textAlignHorizontal,
      textAlignVertical
    } = params || {};
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const node = await getNodeById(nodeId);
    if (node.type !== "TEXT") {
      throw new Error(`Node "${node.name}" (${node.type}) is not a text node: ${nodeId}`);
    }
    const textNode = node;
    if (fontFamily || fontStyle) {
      const currentFont = textNode.fontName === figma.mixed ? { family: "Inter", style: "Regular" } : textNode.fontName;
      const newFont = {
        family: fontFamily || currentFont.family,
        style: fontStyle || currentFont.style
      };
      try {
        await figma.loadFontAsync(newFont);
        textNode.fontName = newFont;
      } catch (error) {
        throw new Error(`Failed to load font "${newFont.family}" with style "${newFont.style}": ${error.message}`);
      }
    } else {
      if (textNode.fontName !== figma.mixed) {
        await figma.loadFontAsync(textNode.fontName);
      } else {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      }
    }
    if (fontSize !== void 0) {
      textNode.fontSize = fontSize;
    }
    if (letterSpacing !== void 0) {
      textNode.letterSpacing = { value: letterSpacing, unit: "PIXELS" };
    }
    if (lineHeight !== void 0) {
      if (lineHeight === "AUTO") {
        textNode.lineHeight = { unit: "AUTO" };
      } else {
        textNode.lineHeight = { value: lineHeight, unit: "PIXELS" };
      }
    }
    if (paragraphSpacing !== void 0) {
      textNode.paragraphSpacing = paragraphSpacing;
    }
    if (textCase !== void 0) {
      textNode.textCase = textCase;
    }
    if (textDecoration !== void 0) {
      textNode.textDecoration = textDecoration;
    }
    if (textAlignHorizontal !== void 0) {
      textNode.textAlignHorizontal = textAlignHorizontal;
    }
    if (textAlignVertical !== void 0) {
      textNode.textAlignVertical = textAlignVertical;
    }
    return {
      id: textNode.id,
      name: textNode.name,
      fontName: textNode.fontName !== figma.mixed ? textNode.fontName : "mixed",
      fontSize: textNode.fontSize !== figma.mixed ? textNode.fontSize : "mixed",
      letterSpacing: textNode.letterSpacing,
      lineHeight: textNode.lineHeight,
      paragraphSpacing: textNode.paragraphSpacing,
      textCase: textNode.textCase !== figma.mixed ? textNode.textCase : "mixed",
      textDecoration: textNode.textDecoration !== figma.mixed ? textNode.textDecoration : "mixed",
      textAlignHorizontal: textNode.textAlignHorizontal,
      textAlignVertical: textNode.textAlignVertical
    };
  }
  __name(setTextProperties, "setTextProperties");

  // src/figma-plugin/handlers/paint-styles.ts
  async function getPaintStyles() {
    const paintStyles = await figma.getLocalPaintStylesAsync();
    const styles = paintStyles.map((style) => {
      const paint = style.paints[0];
      const result = {
        id: style.id,
        name: style.name,
        key: style.key,
        type: paint?.type === "SOLID" ? "SOLID" : paint?.type || "SOLID"
      };
      if (paint?.type === "SOLID") {
        result.color = {
          r: paint.color.r,
          g: paint.color.g,
          b: paint.color.b,
          a: paint.opacity ?? 1
        };
      } else if (paint?.type?.startsWith("GRADIENT_")) {
        result.gradientStops = paint.gradientStops.map((stop) => ({
          position: stop.position,
          color: {
            r: stop.color.r,
            g: stop.color.g,
            b: stop.color.b,
            a: stop.color.a ?? 1
          }
        }));
      }
      return result;
    });
    return {
      count: styles.length,
      styles
    };
  }
  __name(getPaintStyles, "getPaintStyles");
  async function createPaintStyle(params) {
    const { name, color } = params;
    if (!name) {
      throw new Error("Missing name parameter");
    }
    if (!color) {
      throw new Error("Missing color parameter");
    }
    const style = figma.createPaintStyle();
    style.name = name;
    const paint = {
      type: "SOLID",
      color: {
        r: color.r ?? 0,
        g: color.g ?? 0,
        b: color.b ?? 0
      },
      opacity: color.a ?? 1
    };
    style.paints = [paint];
    return {
      id: style.id,
      name: style.name,
      key: style.key,
      type: "SOLID",
      color: {
        r: paint.color.r,
        g: paint.color.g,
        b: paint.color.b,
        a: paint.opacity ?? 1
      }
    };
  }
  __name(createPaintStyle, "createPaintStyle");
  async function updatePaintStyle(params) {
    const { styleId, name, color } = params;
    if (!styleId) {
      throw new Error("Missing styleId parameter");
    }
    const style = figma.getStyleById(styleId);
    if (!style) {
      throw new Error(`Paint style not found: ${styleId}`);
    }
    if (style.type !== "PAINT") {
      throw new Error(`Style is not a paint style: ${styleId} (type: ${style.type})`);
    }
    if (name !== void 0) {
      style.name = name;
    }
    if (color !== void 0) {
      const paint = {
        type: "SOLID",
        color: {
          r: color.r ?? 0,
          g: color.g ?? 0,
          b: color.b ?? 0
        },
        opacity: color.a ?? 1
      };
      style.paints = [paint];
    }
    const currentPaint = style.paints[0];
    const result = {
      id: style.id,
      name: style.name,
      key: style.key,
      type: currentPaint?.type === "SOLID" ? "SOLID" : currentPaint?.type || "SOLID"
    };
    if (currentPaint?.type === "SOLID") {
      result.color = {
        r: currentPaint.color.r,
        g: currentPaint.color.g,
        b: currentPaint.color.b,
        a: currentPaint.opacity ?? 1
      };
    }
    return result;
  }
  __name(updatePaintStyle, "updatePaintStyle");
  async function applyPaintStyle(params) {
    const { nodeId, styleId, styleName, property = "fills" } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (!styleId && !styleName) {
      throw new Error("Either styleId or styleName must be provided");
    }
    let style = null;
    if (styleId) {
      const foundStyle = figma.getStyleById(styleId);
      if (foundStyle && foundStyle.type === "PAINT") {
        style = foundStyle;
      }
    } else if (styleName) {
      const paintStyles = await figma.getLocalPaintStylesAsync();
      style = paintStyles.find((s) => s.name === styleName) || null;
    }
    if (!style) {
      throw new Error(`Paint style not found: ${styleId || styleName}`);
    }
    const node = await getNodeById(nodeId);
    if (property === "fills") {
      assertNodeCapability(node, "fillStyleId", `Node "${node.name}" does not support fill styles`);
      node.fillStyleId = style.id;
    } else {
      assertNodeCapability(node, "strokeStyleId", `Node "${node.name}" does not support stroke styles`);
      node.strokeStyleId = style.id;
    }
    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      styleId: style.id,
      styleName: style.name,
      property
    };
  }
  __name(applyPaintStyle, "applyPaintStyle");
  async function deletePaintStyle(params) {
    const { styleId } = params;
    if (!styleId) {
      throw new Error("Missing styleId parameter");
    }
    const style = figma.getStyleById(styleId);
    if (!style) {
      throw new Error(`Paint style not found: ${styleId}`);
    }
    if (style.type !== "PAINT") {
      throw new Error(`Style is not a paint style: ${styleId} (type: ${style.type})`);
    }
    const styleName = style.name;
    style.remove();
    return {
      success: true,
      styleId,
      styleName
    };
  }
  __name(deletePaintStyle, "deletePaintStyle");
  async function setGradientFill(params) {
    const { nodeId, gradientType, stops, angle = 0 } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (!gradientType) {
      throw new Error("Missing gradientType parameter");
    }
    if (!stops || stops.length < 2) {
      throw new Error("At least 2 gradient stops are required");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "fills", `Node "${node.name}" does not support fills`);
    const figmaGradientType = `GRADIENT_${gradientType}`;
    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const gradientTransform = [
      [cos, sin, 0.5 - 0.5 * cos - 0.5 * sin],
      [-sin, cos, 0.5 + 0.5 * sin - 0.5 * cos]
    ];
    const gradientPaint = {
      type: figmaGradientType,
      gradientStops: stops.map((stop) => ({
        position: Math.max(0, Math.min(1, stop.position)),
        color: {
          r: stop.color.r ?? 0,
          g: stop.color.g ?? 0,
          b: stop.color.b ?? 0,
          a: stop.color.a ?? 1
        }
      })),
      gradientTransform: gradientType === "LINEAR" ? gradientTransform : void 0
    };
    node.fills = [gradientPaint];
    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      gradientType: figmaGradientType,
      stopsCount: stops.length
    };
  }
  __name(setGradientFill, "setGradientFill");

  // src/figma-plugin/handlers/effects.ts
  function effectInputToFigmaEffect(input) {
    const visible = input.visible ?? true;
    switch (input.type) {
      case "DROP_SHADOW":
        return {
          type: "DROP_SHADOW",
          color: {
            r: input.color?.r ?? 0,
            g: input.color?.g ?? 0,
            b: input.color?.b ?? 0,
            a: input.color?.a ?? 0.25
          },
          offset: {
            x: input.offsetX ?? 0,
            y: input.offsetY ?? 4
          },
          radius: input.radius ?? 4,
          spread: input.spread ?? 0,
          visible,
          blendMode: "NORMAL"
        };
      case "INNER_SHADOW":
        return {
          type: "INNER_SHADOW",
          color: {
            r: input.color?.r ?? 0,
            g: input.color?.g ?? 0,
            b: input.color?.b ?? 0,
            a: input.color?.a ?? 0.25
          },
          offset: {
            x: input.offsetX ?? 0,
            y: input.offsetY ?? 2
          },
          radius: input.radius ?? 4,
          spread: input.spread ?? 0,
          visible,
          blendMode: "NORMAL"
        };
      case "LAYER_BLUR":
        return {
          type: "LAYER_BLUR",
          radius: input.radius ?? 4,
          visible
        };
      case "BACKGROUND_BLUR":
        return {
          type: "BACKGROUND_BLUR",
          radius: input.radius ?? 10,
          visible
        };
      default:
        throw new Error(`Unknown effect type: ${input.type}`);
    }
  }
  __name(effectInputToFigmaEffect, "effectInputToFigmaEffect");
  function figmaEffectToOutput(effect) {
    const result = {
      type: effect.type,
      visible: effect.visible
    };
    if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
      const shadowEffect = effect;
      result.color = {
        r: shadowEffect.color.r,
        g: shadowEffect.color.g,
        b: shadowEffect.color.b,
        a: shadowEffect.color.a
      };
      result.offset = {
        x: shadowEffect.offset.x,
        y: shadowEffect.offset.y
      };
      result.radius = shadowEffect.radius;
      result.spread = shadowEffect.spread;
    } else if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
      const blurEffect = effect;
      result.radius = blurEffect.radius;
    }
    return result;
  }
  __name(figmaEffectToOutput, "figmaEffectToOutput");
  async function getEffectStyles() {
    const effectStyles = await figma.getLocalEffectStylesAsync();
    const styles = effectStyles.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
      effects: style.effects.map(figmaEffectToOutput)
    }));
    return {
      count: styles.length,
      styles
    };
  }
  __name(getEffectStyles, "getEffectStyles");
  async function createEffectStyle(params) {
    const { name, effects } = params;
    if (!name) {
      throw new Error("Missing name parameter");
    }
    if (!effects || effects.length === 0) {
      throw new Error("Missing effects parameter - at least one effect is required");
    }
    const style = figma.createEffectStyle();
    style.name = name;
    style.effects = effects.map(effectInputToFigmaEffect);
    return {
      id: style.id,
      name: style.name,
      key: style.key,
      effects: style.effects.map(figmaEffectToOutput)
    };
  }
  __name(createEffectStyle, "createEffectStyle");
  async function applyEffectStyle(params) {
    const { nodeId, styleId, styleName } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (!styleId && !styleName) {
      throw new Error("Either styleId or styleName must be provided");
    }
    let style = null;
    if (styleId) {
      const foundStyle = figma.getStyleById(styleId);
      if (foundStyle && foundStyle.type === "EFFECT") {
        style = foundStyle;
      }
    } else if (styleName) {
      const effectStyles = await figma.getLocalEffectStylesAsync();
      style = effectStyles.find((s) => s.name === styleName) || null;
    }
    if (!style) {
      throw new Error(`Effect style not found: ${styleId || styleName}`);
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "effectStyleId", `Node "${node.name}" does not support effect styles`);
    node.effectStyleId = style.id;
    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      styleId: style.id,
      styleName: style.name
    };
  }
  __name(applyEffectStyle, "applyEffectStyle");
  async function deleteEffectStyle(params) {
    const { styleId } = params;
    if (!styleId) {
      throw new Error("Missing styleId parameter");
    }
    const style = figma.getStyleById(styleId);
    if (!style) {
      throw new Error(`Effect style not found: ${styleId}`);
    }
    if (style.type !== "EFFECT") {
      throw new Error(`Style is not an effect style: ${styleId} (type: ${style.type})`);
    }
    const styleName = style.name;
    style.remove();
    return {
      success: true,
      styleId,
      styleName
    };
  }
  __name(deleteEffectStyle, "deleteEffectStyle");
  async function setEffects(params) {
    const { nodeId, effects } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (!effects) {
      throw new Error("Missing effects parameter");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "effects", `Node "${node.name}" does not support effects`);
    node.effects = effects.map(effectInputToFigmaEffect);
    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      effectsCount: effects.length
    };
  }
  __name(setEffects, "setEffects");
  async function addDropShadow(params) {
    const { nodeId, color, offsetX = 0, offsetY = 4, radius = 4, spread = 0, visible = true } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (!color) {
      throw new Error("Missing color parameter");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "effects", `Node "${node.name}" does not support effects`);
    const blendNode = node;
    const existingEffects = [...blendNode.effects];
    const newShadow = {
      type: "DROP_SHADOW",
      color: {
        r: color.r ?? 0,
        g: color.g ?? 0,
        b: color.b ?? 0,
        a: color.a ?? 0.25
      },
      offset: { x: offsetX, y: offsetY },
      radius,
      spread,
      visible,
      blendMode: "NORMAL"
    };
    blendNode.effects = [...existingEffects, newShadow];
    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      effectsCount: blendNode.effects.length
    };
  }
  __name(addDropShadow, "addDropShadow");
  async function addInnerShadow(params) {
    const { nodeId, color, offsetX = 0, offsetY = 2, radius = 4, spread = 0, visible = true } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (!color) {
      throw new Error("Missing color parameter");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "effects", `Node "${node.name}" does not support effects`);
    const blendNode = node;
    const existingEffects = [...blendNode.effects];
    const newShadow = {
      type: "INNER_SHADOW",
      color: {
        r: color.r ?? 0,
        g: color.g ?? 0,
        b: color.b ?? 0,
        a: color.a ?? 0.25
      },
      offset: { x: offsetX, y: offsetY },
      radius,
      spread,
      visible,
      blendMode: "NORMAL"
    };
    blendNode.effects = [...existingEffects, newShadow];
    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      effectsCount: blendNode.effects.length
    };
  }
  __name(addInnerShadow, "addInnerShadow");
  async function addLayerBlur(params) {
    const { nodeId, radius, visible = true } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (radius === void 0 || radius === null) {
      throw new Error("Missing radius parameter");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "effects", `Node "${node.name}" does not support effects`);
    const blendNode = node;
    const existingEffects = [...blendNode.effects];
    const newBlur = {
      type: "LAYER_BLUR",
      radius,
      visible
    };
    blendNode.effects = [...existingEffects, newBlur];
    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      effectsCount: blendNode.effects.length
    };
  }
  __name(addLayerBlur, "addLayerBlur");
  async function addBackgroundBlur(params) {
    const { nodeId, radius, visible = true } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (radius === void 0 || radius === null) {
      throw new Error("Missing radius parameter");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "effects", `Node "${node.name}" does not support effects`);
    const blendNode = node;
    const existingEffects = [...blendNode.effects];
    const newBlur = {
      type: "BACKGROUND_BLUR",
      radius,
      visible
    };
    blendNode.effects = [...existingEffects, newBlur];
    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      effectsCount: blendNode.effects.length
    };
  }
  __name(addBackgroundBlur, "addBackgroundBlur");

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
    if (!clone.parent) {
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
  async function getConstraints(params) {
    const { nodeId } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "constraints", `Node "${node.name}" does not support constraints`);
    const constrainedNode = node;
    return {
      nodeId: node.id,
      nodeName: node.name,
      horizontal: constrainedNode.constraints.horizontal,
      vertical: constrainedNode.constraints.vertical
    };
  }
  __name(getConstraints, "getConstraints");
  async function setConstraints(params) {
    const { nodeId, horizontal, vertical } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (horizontal === void 0 && vertical === void 0) {
      throw new Error("At least one constraint (horizontal or vertical) must be provided");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "constraints", `Node "${node.name}" does not support constraints`);
    const constrainedNode = node;
    const currentConstraints = { ...constrainedNode.constraints };
    constrainedNode.constraints = {
      horizontal: horizontal ?? currentConstraints.horizontal,
      vertical: vertical ?? currentConstraints.vertical
    };
    return {
      nodeId: node.id,
      nodeName: node.name,
      horizontal: constrainedNode.constraints.horizontal,
      vertical: constrainedNode.constraints.vertical
    };
  }
  __name(setConstraints, "setConstraints");

  // src/figma-plugin/handlers/grid-styles.ts
  function layoutGridInputToFigma(input) {
    const baseGrid = {
      visible: input.visible ?? true,
      color: input.color ? {
        r: input.color.r ?? 1,
        g: input.color.g ?? 0,
        b: input.color.b ?? 0,
        a: input.color.a ?? 0.1
      } : { r: 1, g: 0, b: 0, a: 0.1 }
    };
    if (input.pattern === "GRID") {
      return {
        ...baseGrid,
        pattern: "GRID",
        sectionSize: input.sectionSize ?? 10
      };
    }
    return {
      ...baseGrid,
      pattern: input.pattern,
      alignment: input.alignment ?? "STRETCH",
      gutterSize: input.gutterSize ?? 20,
      count: input.count ?? 12,
      sectionSize: input.sectionSize ?? 1,
      offset: input.offset ?? 0
    };
  }
  __name(layoutGridInputToFigma, "layoutGridInputToFigma");
  function figmaLayoutGridToOutput(grid) {
    const result = {
      pattern: grid.pattern,
      visible: grid.visible,
      color: grid.color ? {
        r: grid.color.r,
        g: grid.color.g,
        b: grid.color.b,
        a: grid.color.a
      } : void 0
    };
    if (grid.pattern === "GRID") {
      result.sectionSize = grid.sectionSize;
    } else {
      result.alignment = grid.alignment;
      result.gutterSize = grid.gutterSize;
      result.count = grid.count;
      result.sectionSize = grid.sectionSize;
      result.offset = grid.offset;
    }
    return result;
  }
  __name(figmaLayoutGridToOutput, "figmaLayoutGridToOutput");
  async function getGridStyles() {
    const gridStyles = await figma.getLocalGridStylesAsync();
    const styles = gridStyles.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
      grids: style.layoutGrids.map(figmaLayoutGridToOutput)
    }));
    return {
      count: styles.length,
      styles
    };
  }
  __name(getGridStyles, "getGridStyles");
  async function createGridStyle(params) {
    const { name, grids } = params;
    if (!name) {
      throw new Error("Missing name parameter");
    }
    if (!grids || grids.length === 0) {
      throw new Error("Missing grids parameter - at least one grid is required");
    }
    const style = figma.createGridStyle();
    style.name = name;
    style.layoutGrids = grids.map(layoutGridInputToFigma);
    return {
      id: style.id,
      name: style.name,
      key: style.key,
      grids: style.layoutGrids.map(figmaLayoutGridToOutput)
    };
  }
  __name(createGridStyle, "createGridStyle");
  async function applyGridStyle(params) {
    const { nodeId, styleId, styleName } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (!styleId && !styleName) {
      throw new Error("Either styleId or styleName must be provided");
    }
    let style = null;
    if (styleId) {
      const foundStyle = figma.getStyleById(styleId);
      if (foundStyle && foundStyle.type === "GRID") {
        style = foundStyle;
      }
    } else if (styleName) {
      const gridStyles = await figma.getLocalGridStylesAsync();
      style = gridStyles.find((s) => s.name === styleName) || null;
    }
    if (!style) {
      throw new Error(`Grid style not found: ${styleId || styleName}`);
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "gridStyleId", `Node "${node.name}" does not support grid styles (must be a frame)`);
    node.gridStyleId = style.id;
    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      styleId: style.id,
      styleName: style.name
    };
  }
  __name(applyGridStyle, "applyGridStyle");
  async function deleteGridStyle(params) {
    const { styleId } = params;
    if (!styleId) {
      throw new Error("Missing styleId parameter");
    }
    const style = figma.getStyleById(styleId);
    if (!style) {
      throw new Error(`Grid style not found: ${styleId}`);
    }
    if (style.type !== "GRID") {
      throw new Error(`Style is not a grid style: ${styleId} (type: ${style.type})`);
    }
    const styleName = style.name;
    style.remove();
    return {
      success: true,
      styleId,
      styleName
    };
  }
  __name(deleteGridStyle, "deleteGridStyle");
  async function setLayoutGrids(params) {
    const { nodeId, grids } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    if (!grids) {
      throw new Error("Missing grids parameter");
    }
    const node = await getNodeById(nodeId);
    assertNodeCapability(node, "layoutGrids", `Node "${node.name}" does not support layout grids (must be a frame)`);
    node.layoutGrids = grids.map(layoutGridInputToFigma);
    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      gridsCount: grids.length
    };
  }
  __name(setLayoutGrids, "setLayoutGrids");

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
  async function createComponent(params) {
    const { nodeId, name } = params;
    if (!nodeId) {
      throw new Error("Missing nodeId parameter");
    }
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    if (!("type" in node) || !["FRAME", "GROUP", "RECTANGLE", "ELLIPSE", "POLYGON", "STAR", "LINE", "VECTOR", "TEXT"].includes(node.type)) {
      throw new Error(`Cannot convert node type ${node.type} to component. Use FRAME, GROUP, or shape nodes.`);
    }
    const component = figma.createComponentFromNode(node);
    if (name) {
      component.name = name;
    }
    return {
      id: component.id,
      name: component.name,
      key: component.key,
      type: "COMPONENT",
      description: component.description,
      documentationLinks: component.documentationLinks?.map((link) => link.uri) || [],
      remote: component.remote
    };
  }
  __name(createComponent, "createComponent");
  async function createComponentSet(params) {
    const { componentIds, name } = params;
    if (!componentIds || componentIds.length === 0) {
      throw new Error("Missing componentIds parameter");
    }
    if (componentIds.length < 2) {
      throw new Error("At least 2 components are required to create a component set");
    }
    const components = [];
    for (const id of componentIds) {
      const node = await figma.getNodeByIdAsync(id);
      if (!node) {
        throw new Error(`Component not found: ${id}`);
      }
      if (node.type !== "COMPONENT") {
        throw new Error(`Node ${id} is not a component (type: ${node.type})`);
      }
      components.push(node);
    }
    const componentSet = figma.combineAsVariants(components, figma.currentPage);
    if (name) {
      componentSet.name = name;
    }
    const variantGroupProperties = {};
    if (componentSet.variantGroupProperties) {
      for (const [propName, propData] of Object.entries(componentSet.variantGroupProperties)) {
        variantGroupProperties[propName] = {
          values: propData.values
        };
      }
    }
    return {
      id: componentSet.id,
      name: componentSet.name,
      key: componentSet.key,
      type: "COMPONENT_SET",
      description: componentSet.description,
      componentIds: componentSet.children.map((child) => child.id),
      variantGroupProperties
    };
  }
  __name(createComponentSet, "createComponentSet");
  async function getComponentProperties(params) {
    const { componentId } = params;
    if (!componentId) {
      throw new Error("Missing componentId parameter");
    }
    const node = await figma.getNodeByIdAsync(componentId);
    if (!node) {
      throw new Error(`Node not found: ${componentId}`);
    }
    if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") {
      throw new Error(`Node is not a component or component set (type: ${node.type})`);
    }
    const componentNode = node;
    const properties = [];
    if (componentNode.componentPropertyDefinitions) {
      for (const [propName, propDef] of Object.entries(componentNode.componentPropertyDefinitions)) {
        properties.push({
          name: propName,
          type: propDef.type,
          defaultValue: propDef.defaultValue,
          preferredValues: propDef.preferredValues?.map((pv) => ({
            type: pv.type,
            key: pv.key
          })),
          variantOptions: propDef.variantOptions
        });
      }
    }
    return {
      componentId: componentNode.id,
      componentName: componentNode.name,
      componentType: componentNode.type,
      properties
    };
  }
  __name(getComponentProperties, "getComponentProperties");
  async function addComponentProperty(params) {
    const { componentId, propertyName, propertyType, defaultValue, preferredValues, variantOptions } = params;
    if (!componentId) {
      throw new Error("Missing componentId parameter");
    }
    if (!propertyName) {
      throw new Error("Missing propertyName parameter");
    }
    if (!propertyType) {
      throw new Error("Missing propertyType parameter");
    }
    const node = await figma.getNodeByIdAsync(componentId);
    if (!node) {
      throw new Error(`Node not found: ${componentId}`);
    }
    if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") {
      throw new Error(`Node is not a component or component set (type: ${node.type})`);
    }
    const componentNode = node;
    const propertyDef = {
      type: propertyType,
      defaultValue
    };
    if (preferredValues) {
      propertyDef.preferredValues = preferredValues;
    }
    if (variantOptions) {
      propertyDef.variantOptions = variantOptions;
    }
    componentNode.addComponentProperty(propertyName, propertyDef.type, propertyDef.defaultValue);
    return {
      success: true,
      componentId: componentNode.id,
      propertyName,
      propertyType
    };
  }
  __name(addComponentProperty, "addComponentProperty");
  async function setComponentPropertyValue(params) {
    const { instanceId, propertyName, value } = params;
    if (!instanceId) {
      throw new Error("Missing instanceId parameter");
    }
    if (!propertyName) {
      throw new Error("Missing propertyName parameter");
    }
    if (value === void 0) {
      throw new Error("Missing value parameter");
    }
    const node = await figma.getNodeByIdAsync(instanceId);
    if (!node) {
      throw new Error(`Node not found: ${instanceId}`);
    }
    if (node.type !== "INSTANCE") {
      throw new Error(`Node is not an instance (type: ${node.type})`);
    }
    const instance = node;
    instance.setProperties({
      [propertyName]: value
    });
    return {
      success: true,
      instanceId: instance.id,
      propertyName,
      value
    };
  }
  __name(setComponentPropertyValue, "setComponentPropertyValue");
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
      case "create_ellipse":
        return await createEllipse(params);
      // Styling
      case "set_fill_color":
        return await setFillColor(params);
      case "set_stroke_color":
        return await setStrokeColor(params);
      case "set_corner_radius":
        return await setCornerRadius(params);
      case "set_opacity":
        return await setOpacity(params);
      // Organization
      case "group_nodes":
        return await groupNodes(params);
      case "ungroup_node":
        return await ungroupNode(params);
      // Variables (Design Tokens)
      case "get_local_variable_collections":
        return await getLocalVariableCollections();
      case "get_local_variables":
        return await getLocalVariables(params);
      case "create_variable_collection":
        return await createVariableCollection(params);
      case "create_variable":
        return await createVariable(params);
      case "set_variable_value":
        return await setVariableValue(params);
      case "delete_variable":
        return await deleteVariable(params);
      case "get_bound_variables":
        return await getBoundVariables(params);
      case "bind_variable":
        return await bindVariable(params);
      case "unbind_variable":
        return await unbindVariable(params);
      // Typography
      case "get_available_fonts":
        return await getAvailableFonts(params);
      case "load_font":
        return await loadFont(params);
      case "get_text_styles":
        return await getTextStyles();
      case "create_text_style":
        return await createTextStyle(params);
      case "apply_text_style":
        return await applyTextStyle(params);
      case "set_text_properties":
        return await setTextProperties(params);
      // Paint Styles
      case "get_paint_styles":
        return await getPaintStyles();
      case "create_paint_style":
        return await createPaintStyle(params);
      case "update_paint_style":
        return await updatePaintStyle(params);
      case "apply_paint_style":
        return await applyPaintStyle(params);
      case "delete_paint_style":
        return await deletePaintStyle(params);
      case "set_gradient_fill":
        return await setGradientFill(params);
      // Effect Styles
      case "get_effect_styles":
        return await getEffectStyles();
      case "create_effect_style":
        return await createEffectStyle(params);
      case "apply_effect_style":
        return await applyEffectStyle(params);
      case "delete_effect_style":
        return await deleteEffectStyle(params);
      case "set_effects":
        return await setEffects(params);
      case "add_drop_shadow":
        return await addDropShadow(params);
      case "add_inner_shadow":
        return await addInnerShadow(params);
      case "add_layer_blur":
        return await addLayerBlur(params);
      case "add_background_blur":
        return await addBackgroundBlur(params);
      // Constraints
      case "get_constraints":
        return await getConstraints(params);
      case "set_constraints":
        return await setConstraints(params);
      // Grid Styles
      case "get_grid_styles":
        return await getGridStyles();
      case "create_grid_style":
        return await createGridStyle(params);
      case "apply_grid_style":
        return await applyGridStyle(params);
      case "delete_grid_style":
        return await deleteGridStyle(params);
      case "set_layout_grids":
        return await setLayoutGrids(params);
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
      case "create_component":
        return await createComponent(params);
      case "create_component_set":
        return await createComponentSet(params);
      case "create_component_instance":
        return await createComponentInstance(params);
      case "get_component_properties":
        return await getComponentProperties(params);
      case "add_component_property":
        return await addComponentProperty(params);
      case "set_component_property_value":
        return await setComponentPropertyValue(params);
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
