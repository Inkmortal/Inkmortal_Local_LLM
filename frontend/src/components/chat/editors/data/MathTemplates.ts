import { MathTemplateType } from '../types/SnippetTypes';

// Math expression templates organized by category
export const mathTemplates: Record<string, MathTemplateType[]> = {
  'Basic Math': [
    { name: 'Fraction', latex: '\\frac{a}{b}', description: 'Simple fraction' },
    { name: 'Square Root', latex: '\\sqrt{x}', description: 'Square root' },
    { name: 'Cube Root', latex: '\\sqrt[3]{x}', description: 'Cube root' },
    { name: 'Power', latex: 'x^{n}', description: 'Value raised to a power' },
    { name: 'Subscript', latex: 'x_{i}', description: 'Subscript notation' },
    { name: 'Pi', latex: '\\pi', description: 'Pi constant' },
  ],
  'Algebra': [
    { name: 'Quadratic Formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', description: 'Solving quadratic equations' },
    { name: 'Binomial', latex: '(x+y)^{n}', description: 'Binomial expression' },
    { name: 'Summation', latex: '\\sum_{i=1}^{n} i', description: 'Sum of sequence' },
    { name: 'Product', latex: '\\prod_{i=1}^{n} i', description: 'Product of sequence' },
    { name: 'Limit', latex: '\\lim_{x \\to a} f(x)', description: 'Limit of a function' },
  ],
  'Calculus': [
    { name: 'Derivative', latex: '\\frac{d}{dx}f(x)', description: 'Derivative of a function' },
    { name: 'Partial Derivative', latex: '\\frac{\\partial f}{\\partial x}', description: 'Partial derivative' },
    { name: 'Integral', latex: '\\int_{a}^{b} f(x) \\, dx', description: 'Definite integral' },
    { name: 'Double Integral', latex: '\\iint_{D} f(x,y) \\, dx \\, dy', description: 'Double integral' },
    { name: 'Triple Integral', latex: '\\iiint_{E} f(x,y,z) \\, dx \\, dy \\, dz', description: 'Triple integral' },
  ],
  'Statistics': [
    { name: 'Mean', latex: '\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i', description: 'Arithmetic mean' },
    { name: 'Standard Deviation', latex: '\\sigma = \\sqrt{\\frac{1}{N}\\sum_{i=1}^{N}(x_i - \\mu)^2}', description: 'Standard deviation' },
    { name: 'Normal Distribution', latex: 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{1}{2}(\\frac{x-\\mu}{\\sigma})^2}', description: 'Normal distribution' },
    { name: 'Binomial Coefficient', latex: '\\binom{n}{k}', description: 'Binomial coefficient' },
  ],
  'Linear Algebra': [
    { name: 'Matrix', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', description: '2×2 matrix' },
    { name: 'Determinant', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', description: '2×2 determinant' },
    { name: 'Vector', latex: '\\vec{v} = \\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}', description: '3D vector' },
    { name: 'Dot Product', latex: '\\vec{a} \\cdot \\vec{b}', description: 'Vector dot product' },
    { name: 'Cross Product', latex: '\\vec{a} \\times \\vec{b}', description: 'Vector cross product' },
  ],
  'Greek Letters': [
    { name: 'Alpha', latex: '\\alpha', description: 'Alpha' },
    { name: 'Beta', latex: '\\beta', description: 'Beta' },
    { name: 'Gamma', latex: '\\gamma', description: 'Gamma' },
    { name: 'Delta', latex: '\\delta', description: 'Delta' },
    { name: 'Epsilon', latex: '\\epsilon', description: 'Epsilon' },
    { name: 'Theta', latex: '\\theta', description: 'Theta' },
    { name: 'Lambda', latex: '\\lambda', description: 'Lambda' },
    { name: 'Mu', latex: '\\mu', description: 'Mu' },
    { name: 'Pi', latex: '\\pi', description: 'Pi' },
    { name: 'Sigma', latex: '\\sigma', description: 'Sigma' },
    { name: 'Phi', latex: '\\phi', description: 'Phi' },
    { name: 'Omega', latex: '\\omega', description: 'Omega' },
  ],
  'Set Theory': [
    { name: 'Union', latex: 'A \\cup B', description: 'Set union' },
    { name: 'Intersection', latex: 'A \\cap B', description: 'Set intersection' },
    { name: 'Subset', latex: 'A \\subset B', description: 'A is a subset of B' },
    { name: 'Element of', latex: 'x \\in A', description: 'x is an element of A' },
    { name: 'Empty Set', latex: '\\emptyset', description: 'Empty set' },
  ],
};

// Flatten templates for search functionality
export const allTemplates: MathTemplateType[] = Object.values(mathTemplates).flat();