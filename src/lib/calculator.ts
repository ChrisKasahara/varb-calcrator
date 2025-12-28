export type Operation = '+' | '-' | '×' | '÷';
export type VariableColor = 'red' | 'yellow' | 'blue' | 'orange' | 'green' | 'white';

export interface ExpressionToken {
  type: 'operand' | 'operator' | 'parenthesis';
  value: string;
  label?: string; // User defined name for the operand
  unit?: string; // Unit string (e.g. "円", "kg")
  id?: string; // Unique ID to identify which token to rename
  numberLabel?: string; // Value + Unit
  nameLabel?: string; // Label + (Unit)
  color?: VariableColor; // Color for highlighting
}

export interface HistoryItem {
  expressionTokens: ExpressionToken[];
  result: string;
}

export interface SavedVariable {
  label: string;
  value: string;
  unit?: string;
  timestamp: number;
  color?: VariableColor;
}

export class Calculator {
  private currentValue: string = '0';
  private currentLabel: string | null = null;
  private currentUnit: string | null = null;
  private currentColor: VariableColor | null = null;
  
  // Previous value logic is kept for basic 1+1 intermediate calc visualization if needed,
  // but we primarily rely on inputHistory for the full expression now.
  private previousValue: string | null = null;
  private previousLabel: string | null = null;
  private previousUnit: string | null = null;
  private previousColor: VariableColor | null = null;
  
  private operation: Operation | null = null;
  private shouldResetScreen: boolean = false;
  private history: HistoryItem[] = [];
  private variables: SavedVariable[] = [];

  // Used to persist expression tokens even after calculation for history
  private lastExpressionTokens: ExpressionToken[] | null = null;
  
  // Accumulates all tokens in the current expression chain (until = is pressed)
  private inputHistory: ExpressionToken[] = [];
  
  // Tracks whether current value is an intermediate result (gray, non-editable)
  private isIntermediateResult: boolean = false;

  constructor() {}

  public inputDigit(digit: string): void {
    if (this.currentValue[0] === '0' && this.currentValue.length === 1 && digit === '0') return;
    
    if (this.shouldResetScreen) {
      this.currentValue = digit;
      this.currentLabel = null; // Reset label on new input start
      this.currentUnit = null;  // Reset unit on new input start
      this.currentColor = null; // Reset color on new input start
      this.shouldResetScreen = false;
      this.isIntermediateResult = false; // User is typing, no longer intermediate
      
      // If we just finished a calculation (shouldResetScreen=true) and user types a number,
      // we usually start fresh. Logic handled in inputHistory management.
      if (this.operation === null && this.inputHistory.length === 0) {
          // Fresh start
      }
    } else {
      if (this.currentValue === '0' && digit !== '.') {
        this.currentValue = digit;
      } else {
          if(digit === '.' && this.currentValue.includes('.')) return;
        this.currentValue += digit;
        this.currentLabel = null; // Clear label if modifying value
      }
    }
  }

  public inputDot(): void {
      if (!this.currentValue.includes('.')) {
          this.currentValue += '.';
          this.shouldResetScreen = false;
      }
  }

  public inputParenthesis(type: '(' | ')'): void {
      // If user types '('
      // If we are typing a number (not reset screen), it's multiplication? "2(" -> "2 * ("
      // For now, simpler: '(' is allowed at start or after operator.
      // If after number, assume multiplication? Let's just push it for now.
      
      if (type === '(') {
          if (!this.shouldResetScreen && this.currentValue !== '0' && this.currentValue !== '') {
              // Implicit multiplication: 2( -> 2 * (
              this.setOperation('×');
          }
          this.inputHistory.push({ type: 'parenthesis', value: '(' });
      } else {
          // ')'
          // Push current value first if valid
          if (!this.shouldResetScreen) {
             this.pushCurrentValueToHistory();
          }
          this.inputHistory.push({ type: 'parenthesis', value: ')' });
          this.shouldResetScreen = true; // After ')', next input starts new or follows op
      }
  }

  private pushCurrentValueToHistory(): void {
      this.inputHistory.push({
        type: 'operand',
        value: this.currentValue,
        label: this.currentLabel || undefined,
        unit: this.currentUnit || undefined,
        numberLabel: this.formatNumberLabel(this.currentValue, this.currentUnit),
        nameLabel: this.formatNameLabel(this.currentLabel, this.currentUnit),
        color: this.currentColor || undefined
      });
  }

  public setOperation(op: Operation): void {
    const isStartingNewCalculation = this.shouldResetScreen && this.inputHistory.length === 0;
    const hasTypedNewValue = !this.shouldResetScreen;
    
    // If user presses op after typing number, push number.
    if (hasTypedNewValue) {
      this.pushCurrentValueToHistory();
    } 
    // If user presses op after result (isStartingNewCalculation), 
    // we use the result as the first operand.
    else if (isStartingNewCalculation) {
        // Only if inputHistory is empty (meaning we just cleared or finished calc)
        // AND we have a currentValue (result).
         this.inputHistory.push({
            type: 'operand',
            value: this.currentValue,
            label: this.currentLabel || undefined,
            unit: this.currentUnit || undefined,
            numberLabel: this.formatNumberLabel(this.currentValue, this.currentUnit),
            nameLabel: this.formatNameLabel(this.currentLabel, this.currentUnit),
            color: this.currentColor || undefined
        });
    } else {
        // If user presses op after just pushing an operator, replace it?
        // Or if after ')'.
        const last = this.inputHistory[this.inputHistory.length - 1];
        if (last && last.type === 'operator') {
            last.value = op; // Replace operator
            this.operation = op;
            return;
        }
    }
    
    this.inputHistory.push({
      type: 'operator',
      value: op
    });
    
    this.operation = op; // Keep for display/intermediate logic if needed, but primary is inputHistory
    this.shouldResetScreen = true;
    
    // Reset "current" naming/coloring properties for the next number
    this.currentLabel = null;
    this.currentUnit = null;
    this.currentColor = null;
  }

  // Not used as strictly anymore, but compatible fallback
  private calculateIntermediate(): void {
     // No-op for complex precedence calculator or implement partial eval
  }

  public calculate(): void {
    // 1. Push final value if pending
    if (!this.shouldResetScreen) {
        this.pushCurrentValueToHistory();
    }
    
    const expression = [...this.inputHistory];
    
    if (expression.length === 0) return;

    // 2. Evaluate using Shunting-yard + RPN Evaluator
    try {
        const resultVal = this.evaluateExpression(expression);
        const resultString = this.formatResult(resultVal);

        // 3. Save History
        this.history.unshift({
            expressionTokens: [...expression],
            result: resultString
        });
        if (this.history.length > 50) this.history.pop();
        
        // 4. Reset State
        this.currentValue = resultString;
        this.inputHistory = []; // Clear current expression
        this.shouldResetScreen = true;
        this.isIntermediateResult = false;
        
        this.operation = null;
        this.currentLabel = null; 
        this.currentUnit = null;
        this.currentColor = null;

    } catch (e) {
        this.handleError();
    }
  }

  private evaluateExpression(tokens: ExpressionToken[]): number {
      const outputQueue: ExpressionToken[] = [];
      const operatorStack: ExpressionToken[] = [];
      
      const precedence: {[key: string]: number} = {
          '+': 1, '-': 1,
          '×': 2, '÷': 2
      };

      tokens.forEach(token => {
          if (token.type === 'operand') {
              outputQueue.push(token);
          } else if (token.type === 'operator') {
              while (operatorStack.length > 0 && 
                     operatorStack[operatorStack.length - 1].type === 'operator' &&
                     precedence[operatorStack[operatorStack.length - 1].value] >= precedence[token.value]) {
                  outputQueue.push(operatorStack.pop()!);
              }
              operatorStack.push(token);
          } else if (token.type === 'parenthesis') {
              if (token.value === '(') {
                  operatorStack.push(token);
              } else {
                  while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].value !== '(') {
                      outputQueue.push(operatorStack.pop()!);
                  }
                  if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].value === '(') {
                      operatorStack.pop(); // Pop '('
                  }
              }
          }
      });
      
      while (operatorStack.length > 0) {
          const op = operatorStack.pop()!;
          if (op.type === 'parenthesis') continue; // Mismatched parens logic
          outputQueue.push(op);
      }
      
      // RPN Evaluation
      const evalStack: number[] = [];
      outputQueue.forEach(token => {
          if (token.type === 'operand') {
              evalStack.push(parseFloat(token.value));
          } else if (token.type === 'operator') {
              const b = evalStack.pop();
              const a = evalStack.pop();
              if (a === undefined || b === undefined) throw new Error("Invalid Expression");
              
              let res = 0;
              switch (token.value) {
                  case '+': res = a + b; break;
                  case '-': res = a - b; break;
                  case '×': res = a * b; break;
                  case '÷': 
                    if (b === 0) throw new Error("Division by Zero");
                    res = a / b; break;
              }
              evalStack.push(res);
          }
      });
      
      if (evalStack.length === 0) return 0;
      return evalStack[0];
  }

  public clear(): void {
    this.currentValue = '0';
    this.currentLabel = null;
    this.currentUnit = null;
    this.previousValue = null;
    this.previousLabel = null;
    this.previousUnit = null;
    this.operation = null;
    this.shouldResetScreen = false;
    this.lastExpressionTokens = null;
    this.inputHistory = [];
    this.isIntermediateResult = false;
    this.currentColor = null;
    this.previousColor = null;
  }

  public delete(): void {
      if (this.shouldResetScreen) return;
      if (this.currentValue.length === 1) {
          this.currentValue = '0';
      } else {
          this.currentValue = this.currentValue.slice(0, -1);
      }
  }

  public toggleSign(): void {
      const value = parseFloat(this.currentValue);
      if (value === 0) return;
      this.currentValue = (value * -1).toString();
  }

  public percentage(): void {
      const value = parseFloat(this.currentValue);
      this.currentValue = (value / 100).toString();
  }

  public setLabel(target: 'current' | 'previous', label: string, color?: VariableColor | null): void {
      // Logic adaptation: 'previous' is now ambiguous with history, but usually implies the last entered operand.
      // 'current' is the one being typed.
      
      if (target === 'current') {
          this.currentLabel = label;
          if (color !== undefined) this.currentColor = color;
      } else {
          // Find last operand in inputHistory
           if (this.inputHistory.length > 0) {
              for (let i = this.inputHistory.length - 1; i >= 0; i--) {
                  if (this.inputHistory[i].type === 'operand') {
                      this.inputHistory[i].label = label;
                      this.inputHistory[i].nameLabel = this.formatNameLabel(label, this.inputHistory[i].unit || null);
                      if (color !== undefined) this.inputHistory[i].color = color || undefined;
                      break;
                  }
              }
           }
      }
  }

  public setUnit(target: 'current' | 'previous', unit: string | null): void {
      if (target === 'current') {
          this.currentUnit = unit;
      } else {
          if (this.inputHistory.length > 0) {
               for (let i = this.inputHistory.length - 1; i >= 0; i--) {
                  if (this.inputHistory[i].type === 'operand') {
                      this.inputHistory[i].unit = unit || undefined;
                      this.inputHistory[i].numberLabel = this.formatNumberLabel(this.inputHistory[i].value, unit);
                      this.inputHistory[i].nameLabel = this.formatNameLabel(this.inputHistory[i].label || null, unit);
                      break;
                  }
              }
          }
      }
  }

  public loadFromHistory(index: number): void {
      const item = this.history[index];
      if (!item) return;
      
      this.clear();
      this.inputHistory = item.expressionTokens.map(t => ({...t}));
      this.currentValue = item.result;
      this.shouldResetScreen = true;
  }

  public getDisplayValue(): string {
    return this.formatNumber(this.currentValue);
  }

  private formatNumber(value: string | null): string {
      if (!value) return '';
      if (value.includes('e') || value.includes('E')) return value;
      const parts = value.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return parts.join('.');
  }

  private formatNumberLabel(value: string, unit: string | null): string {
      const formattedValue = this.formatNumber(value);
      return unit ? `${formattedValue} ${unit}` : formattedValue;
  }

  private formatNameLabel(label: string | null, unit: string | null): string | undefined {
      if (!label) return undefined;
      return label; // Don't include unit in name label
  }

  public getCurrentUnit(): string | null {
      return this.currentUnit;
  }

  public getCurrentValue(): string {
      return this.currentValue;
  }

  public isIntermediate(): boolean {
      return this.isIntermediateResult;
  }

  // Returns structured tokens for rendering
  public getExpressionTokens(): ExpressionToken[] {
      const tokens = this.buildExpressionTokens(false);
      
      // Ensure all operands have an ID for clickability
      return tokens.map((t, i) => {
          if (t.type === 'operand' && !t.id) {
              return { ...t, id: `token-${i}` };
          }
          return t;
      });
  }

  public getHistory(): HistoryItem[] {
      return this.history;
  }

  // Variable Management
  public saveVariable(label: string, value: string, unit?: string, color?: VariableColor): void {
      const existingIndex = this.variables.findIndex(v => v.label === label);
      const newVar: SavedVariable = {
          label,
          value,
          unit,
          timestamp: Date.now(),
          color
      };

      if (existingIndex >= 0) {
          this.variables[existingIndex] = newVar;
      } else {
          this.variables.push(newVar);
      }
      this.variables.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getVariables(): SavedVariable[] {
      return this.variables;
  }

  public deleteVariable(label: string): void {
      this.variables = this.variables.filter(v => v.label !== label);
  }

  public inputVariable(variable: SavedVariable): void {
      this.inputDigit(variable.value); 
      
      this.currentValue = variable.value;
      this.currentLabel = variable.label;
      this.currentUnit = variable.unit || null;
      this.currentColor = variable.color || null;
      this.shouldResetScreen = false; 
  }

  private buildExpressionTokens(forHistory: boolean = false): ExpressionToken[] {
      // For display, we want to show the full accumulated history + current typing buffer
      let tokens: ExpressionToken[] = [...this.inputHistory];
      
      // Add current value if user is typing (not freshly reset/just calculated)
      // OR if the user just started typing after an operator (shouldResetScreen=false)
      if (!this.shouldResetScreen && this.currentValue !== '') {
          // Avoid duplicating if inputHistory is empty and we are just starting? 
          // No, inputHistory is strictly "committed" tokens. CurrentValue is "buffer".
          tokens.push({
              type: 'operand',
              value: this.currentValue,
              label: this.currentLabel || undefined,
              unit: this.currentUnit || undefined,
              numberLabel: this.formatNumberLabel(this.currentValue, this.currentUnit),
              nameLabel: this.formatNameLabel(this.currentLabel, this.currentUnit),
              color: this.currentColor || undefined,
              id: 'current'
          });
      }
      
      return tokens;
  }

  private handleError(): void {
      this.currentValue = 'Error';
      this.previousValue = null;
      this.operation = null;
      this.shouldResetScreen = true;
      this.inputHistory = [];
  }

  private formatResult(num: number): string {
      const str = num.toString();
      if (str.length > 12) {
          return num.toExponential(6);
      }
      return str;
  }
}
