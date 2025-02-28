import { CodeSnippetType } from '../types/SnippetTypes';

// Code snippets organized by language
export const codeSnippets: Record<string, CodeSnippetType[]> = {
  javascript: [
    {
      name: 'Function Declaration',
      code: 'function functionName(param1, param2) {\n  // Function body\n  return result;\n}',
      description: 'Standard function declaration'
    },
    {
      name: 'Arrow Function',
      code: 'const functionName = (param1, param2) => {\n  // Function body\n  return result;\n};',
      description: 'ES6 arrow function'
    },
    {
      name: 'Promise Chain',
      code: 'fetch(url)\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error(error));',
      description: 'Promise with chained then/catch'
    },
    {
      name: 'Async/Await',
      code: 'async function fetchData() {\n  try {\n    const response = await fetch(url);\n    const data = await response.json();\n    return data;\n  } catch (error) {\n    console.error(error);\n  }\n}',
      description: 'Async function with await'
    },
    {
      name: 'Class Definition',
      code: 'class ClassName {\n  constructor(param1, param2) {\n    this.property1 = param1;\n    this.property2 = param2;\n  }\n\n  methodName() {\n    // Method body\n    return result;\n  }\n}',
      description: 'ES6 class declaration'
    }
  ],
  typescript: [
    {
      name: 'Interface',
      code: 'interface InterfaceName {\n  property1: string;\n  property2: number;\n  method?(param: string): void;\n}',
      description: 'TypeScript interface'
    },
    {
      name: 'Type Alias',
      code: 'type TypeName = {\n  property1: string;\n  property2: number;\n  method?(param: string): void;\n};',
      description: 'TypeScript type alias'
    },
    {
      name: 'Generic Function',
      code: 'function genericFunction<T>(param: T): T {\n  return param;\n}',
      description: 'Generic function'
    },
    {
      name: 'React Component',
      code: 'interface ComponentProps {\n  prop1: string;\n  prop2: number;\n}\n\nconst Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {\n  return (\n    <div>\n      {prop1}: {prop2}\n    </div>\n  );\n};',
      description: 'TypeScript React component'
    },
    {
      name: 'Enum',
      code: 'enum Direction {\n  Up = "UP",\n  Down = "DOWN",\n  Left = "LEFT",\n  Right = "RIGHT"\n}',
      description: 'TypeScript enum'
    }
  ],
  python: [
    {
      name: 'Function Definition',
      code: 'def function_name(param1, param2):\n    """Docstring for function."""\n    # Function body\n    return result',
      description: 'Python function definition'
    },
    {
      name: 'Class Definition',
      code: 'class ClassName:\n    """Docstring for class."""\n    \n    def __init__(self, param1, param2):\n        self.param1 = param1\n        self.param2 = param2\n    \n    def method_name(self, param):\n        """Docstring for method."""\n        # Method body\n        return result',
      description: 'Python class definition'
    },
    {
      name: 'List Comprehension',
      code: 'squares = [x**2 for x in range(10) if x % 2 == 0]',
      description: 'List comprehension with condition'
    },
    {
      name: 'Try/Except',
      code: 'try:\n    # Code that might raise an exception\n    result = risky_function()\nexcept ExceptionType as e:\n    # Handle exception\n    print(f"An error occurred: {e}")\nelse:\n    # Code to run if no exception\n    print("Success!")\nfinally:\n    # Code that always runs\n    cleanup()',
      description: 'Exception handling'
    },
    {
      name: 'With Statement',
      code: 'with open("filename.txt", "r") as file:\n    content = file.read()',
      description: 'Context manager using with'
    }
  ],
  html: [
    {
      name: 'Basic Template',
      code: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>',
      description: 'Basic HTML5 document template'
    },
    {
      name: 'Form',
      code: '<form action="/submit" method="post">\n    <label for="name">Name:</label>\n    <input type="text" id="name" name="name" required>\n    \n    <label for="email">Email:</label>\n    <input type="email" id="email" name="email" required>\n    \n    <button type="submit">Submit</button>\n</form>',
      description: 'HTML form'
    },
    {
      name: 'Table',
      code: '<table>\n    <thead>\n        <tr>\n            <th>Header 1</th>\n            <th>Header 2</th>\n        </tr>\n    </thead>\n    <tbody>\n        <tr>\n            <td>Row 1, Cell 1</td>\n            <td>Row 1, Cell 2</td>\n        </tr>\n        <tr>\n            <td>Row 2, Cell 1</td>\n            <td>Row 2, Cell 2</td>\n        </tr>\n    </tbody>\n</table>',
      description: 'HTML table'
    }
  ],
  css: [
    {
      name: 'Flexbox Container',
      code: '.flex-container {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n    flex-wrap: wrap;\n    gap: 10px;\n}',
      description: 'Flexbox container setup'
    },
    {
      name: 'Grid Container',
      code: '.grid-container {\n    display: grid;\n    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));\n    grid-gap: 20px;\n}',
      description: 'CSS Grid container'
    },
    {
      name: 'Media Query',
      code: '@media screen and (max-width: 768px) {\n    .container {\n        flex-direction: column;\n    }\n    \n    .sidebar {\n        display: none;\n    }\n}',
      description: 'Media query for responsive design'
    }
  ],
  sql: [
    {
      name: 'Select Query',
      code: 'SELECT column1, column2\nFROM table_name\nWHERE condition\nORDER BY column1 ASC\nLIMIT 10;',
      description: 'Basic SELECT query'
    },
    {
      name: 'Join Query',
      code: 'SELECT a.column1, b.column2\nFROM table1 a\nINNER JOIN table2 b ON a.id = b.table1_id\nWHERE a.column3 > 100\nORDER BY a.column1;',
      description: 'JOIN between two tables'
    },
    {
      name: 'Create Table',
      code: 'CREATE TABLE table_name (\n    id INTEGER PRIMARY KEY,\n    name TEXT NOT NULL,\n    age INTEGER,\n    email TEXT UNIQUE\n);',
      description: 'CREATE TABLE statement'
    }
  ],
  java: [
    {
      name: 'Class Definition',
      code: 'public class ClassName {\n    private String property1;\n    private int property2;\n    \n    public ClassName(String property1, int property2) {\n        this.property1 = property1;\n        this.property2 = property2;\n    }\n    \n    public String getProperty1() {\n        return property1;\n    }\n    \n    public void setProperty1(String property1) {\n        this.property1 = property1;\n    }\n}',
      description: 'Java class with properties and constructor'
    },
    {
      name: 'Interface',
      code: 'public interface InterfaceName {\n    void methodOne(String param);\n    int methodTwo(double param1, boolean param2);\n}',
      description: 'Java interface'
    }
  ]
};

// Flatten snippets for search
export const allSnippets: (CodeSnippetType & { language: string })[] = Object.entries(codeSnippets).flatMap(([language, snippets]) => 
  snippets.map(snippet => ({ ...snippet, language }))
);