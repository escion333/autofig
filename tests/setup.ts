/**
 * Vitest setup file - Figma API mocks
 */
import { vi } from 'vitest';

// Mock Figma variable collection
export interface MockVariableCollection {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
  defaultModeId: string;
  variableIds: string[];
  hiddenFromPublishing: boolean;
}

// Mock Figma variable
export interface MockVariable {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: Record<string, unknown>;
  hiddenFromPublishing: boolean;
  scopes: string[];
  codeSyntax: Record<string, string>;
}

// Default mock data
export const mockCollections: MockVariableCollection[] = [
  {
    id: 'collection-1',
    name: 'Colors',
    modes: [
      { modeId: 'mode-light', name: 'Light' },
      { modeId: 'mode-dark', name: 'Dark' },
    ],
    defaultModeId: 'mode-light',
    variableIds: ['var-1', 'var-2'],
    hiddenFromPublishing: false,
  },
  {
    id: 'collection-2',
    name: 'Spacing',
    modes: [{ modeId: 'mode-default', name: 'Default' }],
    defaultModeId: 'mode-default',
    variableIds: ['var-3', 'var-4'],
    hiddenFromPublishing: false,
  },
];

export const mockVariables: MockVariable[] = [
  {
    id: 'var-1',
    name: 'primary/500',
    key: 'key-var-1',
    variableCollectionId: 'collection-1',
    resolvedType: 'COLOR',
    valuesByMode: {
      'mode-light': { r: 0.2, g: 0.4, b: 1, a: 1 },
      'mode-dark': { r: 0.4, g: 0.6, b: 1, a: 1 },
    },
    hiddenFromPublishing: false,
    scopes: ['ALL_SCOPES'],
    codeSyntax: {},
  },
  {
    id: 'var-2',
    name: 'neutral/100',
    key: 'key-var-2',
    variableCollectionId: 'collection-1',
    resolvedType: 'COLOR',
    valuesByMode: {
      'mode-light': { r: 0.95, g: 0.95, b: 0.95, a: 1 },
      'mode-dark': { r: 0.1, g: 0.1, b: 0.1, a: 1 },
    },
    hiddenFromPublishing: false,
    scopes: ['ALL_FILLS'],
    codeSyntax: {},
  },
  {
    id: 'var-3',
    name: 'spacing/sm',
    key: 'key-var-3',
    variableCollectionId: 'collection-2',
    resolvedType: 'FLOAT',
    valuesByMode: {
      'mode-default': 8,
    },
    hiddenFromPublishing: false,
    scopes: ['GAP'],
    codeSyntax: { WEB: '--spacing-sm' },
  },
  {
    id: 'var-4',
    name: 'spacing/md',
    key: 'key-var-4',
    variableCollectionId: 'collection-2',
    resolvedType: 'FLOAT',
    valuesByMode: {
      'mode-default': 16,
    },
    hiddenFromPublishing: false,
    scopes: ['GAP'],
    codeSyntax: { WEB: '--spacing-md' },
  },
];

// Mock created variable
let createdVariableIdCounter = 100;
let createdCollectionIdCounter = 100;

// Create mock variable factory
function createMockVariable(
  name: string,
  collection: string | MockVariableCollection,
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'
): MockVariable & { setValueForMode: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> } {
  // Handle both string ID and collection object (Figma API takes collection object)
  const collectionId = typeof collection === 'string' ? collection : collection.id;
  const id = `var-created-${createdVariableIdCounter++}`;
  const variable = {
    id,
    name,
    key: `key-${id}`,
    variableCollectionId: collectionId,
    resolvedType,
    valuesByMode: {} as Record<string, unknown>,
    hiddenFromPublishing: false,
    scopes: ['ALL_SCOPES'],
    codeSyntax: {},
    setValueForMode: vi.fn((modeId: string, value: unknown) => {
      variable.valuesByMode[modeId] = value;
    }),
    remove: vi.fn(),
  };
  return variable;
}

// Create mock collection factory
function createMockCollection(name: string, modes?: string[]): MockVariableCollection & {
  renameMode: ReturnType<typeof vi.fn>;
  addMode: ReturnType<typeof vi.fn>;
} {
  const id = `collection-created-${createdCollectionIdCounter++}`;
  const defaultModeId = `mode-${id}-default`;
  const collection = {
    id,
    name,
    modes: [{ modeId: defaultModeId, name: modes?.[0] || 'Mode 1' }],
    defaultModeId,
    variableIds: [] as string[],
    hiddenFromPublishing: false,
    renameMode: vi.fn((modeId: string, newName: string) => {
      const mode = collection.modes.find((m) => m.modeId === modeId);
      if (mode) mode.name = newName;
    }),
    addMode: vi.fn((modeName: string) => {
      collection.modes.push({
        modeId: `mode-${id}-${collection.modes.length}`,
        name: modeName,
      });
    }),
  };
  return collection;
}

// Create global figma mock
const figmaMock = {
  variables: {
    getLocalVariableCollectionsAsync: vi.fn().mockResolvedValue(mockCollections),
    getLocalVariablesAsync: vi.fn().mockResolvedValue(mockVariables),
    getVariableCollectionByIdAsync: vi.fn((id: string) =>
      Promise.resolve(mockCollections.find((c) => c.id === id) || null)
    ),
    getVariableByIdAsync: vi.fn((id: string) =>
      Promise.resolve(mockVariables.find((v) => v.id === id) || null)
    ),
    getVariableCollectionById: vi.fn((id: string) =>
      mockCollections.find((c) => c.id === id) || null
    ),
    getVariableById: vi.fn((id: string) =>
      mockVariables.find((v) => v.id === id) || null
    ),
    createVariable: vi.fn((name: string, collection: string | MockVariableCollection, resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN') =>
      createMockVariable(name, collection, resolvedType)
    ),
    createVariableCollection: vi.fn((name: string) => createMockCollection(name)),
  },
  currentPage: {
    selection: [],
    appendChild: vi.fn(),
    children: [],
  },
  getNodeByIdAsync: vi.fn(),
  notify: vi.fn(),
  closePlugin: vi.fn(),
  ui: {
    postMessage: vi.fn(),
  },
};

// Assign to global
(globalThis as unknown as { figma: typeof figmaMock }).figma = figmaMock;

// Export for use in tests
export { figmaMock };

// Reset mocks between tests
export function resetFigmaMocks() {
  vi.clearAllMocks();
  createdVariableIdCounter = 100;
  createdCollectionIdCounter = 100;
  figmaMock.variables.getLocalVariableCollectionsAsync.mockResolvedValue(mockCollections);
  figmaMock.variables.getLocalVariablesAsync.mockResolvedValue(mockVariables);
  figmaMock.variables.getVariableCollectionByIdAsync.mockImplementation((id: string) =>
    Promise.resolve(mockCollections.find((c) => c.id === id) || null)
  );
  figmaMock.variables.getVariableByIdAsync.mockImplementation((id: string) =>
    Promise.resolve(mockVariables.find((v) => v.id === id) || null)
  );
  figmaMock.variables.createVariable.mockImplementation((name: string, collection: string | MockVariableCollection, resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN') =>
    createMockVariable(name, collection, resolvedType)
  );
  figmaMock.variables.createVariableCollection.mockImplementation((name: string) =>
    createMockCollection(name)
  );
}

// Export factory functions for tests
export { createMockVariable, createMockCollection };

