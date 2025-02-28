// Common type definitions for editor components

export interface CodeSnippetType {
  name: string;
  code: string;
  description: string;
  language?: string;
}

export interface MathTemplateType {
  name: string;
  latex: string;
  description: string;
}

export interface LanguageOptionType {
  value: string;
  label: string;
}