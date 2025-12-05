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

// Create global figma mock
const figmaMock = {
  variables: {
    getLocalVariableCollectionsAsync: vi.fn().mockResolvedValue(mockCollections),
    getLocalVariablesAsync: vi.fn().mockResolvedValue(mockVariables),
    getVariableCollectionById: vi.fn((id: string) =>
      mockCollections.find((c) => c.id === id) || null
    ),
    getVariableById: vi.fn((id: string) =>
      mockVariables.find((v) => v.id === id) || null
    ),
    createVariable: vi.fn(),
    createVariableCollection: vi.fn(),
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
  figmaMock.variables.getLocalVariableCollectionsAsync.mockResolvedValue(mockCollections);
  figmaMock.variables.getLocalVariablesAsync.mockResolvedValue(mockVariables);
}

