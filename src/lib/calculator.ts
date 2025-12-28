export type Operation = '+' | '-' | '×' | '÷';
export type VariableColor = 'red' | 'yellow' | 'blue' | 'orange' | 'green' | 'white';

export interface ExpressionToken {
  type: 'operand' | 'operator';
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
    } else {
      if (this.currentValue === '0' && digit !== '.') {
        this.currentValue = digit;
      } else {
          if(digit === '.' && this.currentValue.includes('.')) return;
        this.currentValue += digit;
        this.currentLabel = null; // Clear label if modifying value
        // Keep unit? (e.g. 100円 -> 1000円). Yes, keeps unit.
      }
    }
  }

  public inputDot(): void {
      if (!this.currentValue.includes('.')) {
          this.currentValue += '.';
          this.shouldResetScreen = false;
      }
  }

  public setOperation(op: Operation): void {
    // Add current value to input history in two cases:
    // 1. User has typed a new value (!shouldResetScreen)
    // 2. Starting a new calculation with previous result (shouldResetScreen && !operation)
    const isStartingNewCalculation = this.shouldResetScreen && this.operation === null;
    const hasTypedNewValue = !this.shouldResetScreen;
    
    if (hasTypedNewValue || isStartingNewCalculation) {
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
    
    // Only calculate intermediate if we have an operation and user has typed something
    if (this.operation !== null && !this.shouldResetScreen) {
      this.calculateIntermediate();
    }
    
    // Add operator to input history (only if we added an operand)
    if (hasTypedNewValue || isStartingNewCalculation) {
      this.inputHistory.push({
        type: 'operator',
        value: op
      });
    }
    
    // Move current to previous
    this.previousValue = this.currentValue;
    this.previousLabel = this.currentLabel;
    this.previousUnit = this.currentUnit;
    this.previousColor = this.currentColor;
    
    this.operation = op;
    this.shouldResetScreen = true;
  }

  // Internal calculation for chain operations (doesn't add to history)
  private calculateIntermediate(): void {
    if (this.previousValue === null || this.operation === null) return;

    const current = parseFloat(this.currentValue);
    const previous = parseFloat(this.previousValue);
    let result = 0;

    switch (this.operation) {
      case '+': result = previous + current; break;
      case '-': result = previous - current; break;
      case '×': result = previous * current; break;
      case '÷':
        if (current === 0) {
            this.handleError();
            return;
        }
        result = previous / current;
        break;
    }

    this.currentValue = this.formatResult(result);
    this.currentLabel = null;
    this.currentUnit = null;
    this.isIntermediateResult = true; // Mark as intermediate result
  }

  public calculate(): void {
    if (this.previousValue === null || this.operation === null) return;

    // If shouldResetScreen is true, user pressed = right after an operator
    // Don't perform calculation, just finalize with current result
    if (this.shouldResetScreen) {
      // Remove trailing operator from inputHistory
      if (this.inputHistory.length > 0 && this.inputHistory[this.inputHistory.length - 1].type === 'operator') {
        this.inputHistory.pop();
      }
      
      // Save current expression to history without adding duplicate operand
      this.history.unshift({
        expressionTokens: [...this.inputHistory],
        result: this.currentValue
      });
      
      if (this.history.length > 50) this.history.pop();
      
      this.inputHistory = [];
      this.operation = null;
      this.previousValue = null;
      this.previousLabel = null;
      this.previousUnit = null;
      this.shouldResetScreen = true;
      this.isIntermediateResult = false; // Final result, not intermediate
      return;
    }

    // Normal calculation flow
    // Add final operand to input history
    this.inputHistory.push({
      type: 'operand',
      value: this.currentValue,
      label: this.currentLabel || undefined,
      unit: this.currentUnit || undefined,
      numberLabel: this.formatNumberLabel(this.currentValue, this.currentUnit),
      nameLabel: this.formatNameLabel(this.currentLabel, this.currentUnit),
      color: this.currentColor || undefined
    });

    const current = parseFloat(this.currentValue);
    const previous = parseFloat(this.previousValue);
    let result = 0;

    switch (this.operation) {
      case '+': result = previous + current; break;
      case '-': result = previous - current; break;
      case '×': result = previous * current; break;
      case '÷':
        if (current === 0) {
            this.handleError();
            return;
        }
        result = previous / current;
        break;
    }

    const resultString = this.formatResult(result);
    
    // Save the accumulated input history
    this.history.unshift({
        expressionTokens: [...this.inputHistory],
        result: resultString
    });

    if (this.history.length > 50) this.history.pop();

    // Clear input history for next calculation
    this.inputHistory = [];

    this.currentValue = resultString;
    this.currentLabel = null; 
    this.currentUnit = null;
    this.currentColor = null;
    
    this.operation = null;
    this.previousValue = null;
    this.previousLabel = null;
    this.previousUnit = null;
    this.previousColor = null;
    this.shouldResetScreen = true;
    this.isIntermediateResult = false; // Final result, not intermediate
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
      if (target === 'current') {
          this.currentLabel = label;
          if (color !== undefined) this.currentColor = color;
      } else if (target === 'previous') {
          this.previousLabel = label;
          if (color !== undefined) this.previousColor = color;
          
          // Also update inputHistory if exists
          if (this.inputHistory.length > 0) {
              // Find the last operand
              for (let i = this.inputHistory.length - 1; i >= 0; i--) {
                  if (this.inputHistory[i].type === 'operand') {
                      this.inputHistory[i].label = label;
                      this.inputHistory[i].nameLabel = this.formatNameLabel(label, this.inputHistory[i].unit || null);
                      if (color !== undefined) this.inputHistory[i].color = color || undefined;
                      break; // Only update the very last operand pushed (which is 'previous')
                  }
              }
          }
      }
  }

  public setUnit(target: 'current' | 'previous', unit: string | null): void {
      if (target === 'current') {
          this.currentUnit = unit;
      } else if (target === 'previous') {
          this.previousUnit = unit;
          
          // Update inputHistory
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
      
      // Deep copy relevant tokens to inputHistory to allow editing/viewing
      this.inputHistory = item.expressionTokens.map(t => ({...t}));
      
      this.currentValue = item.result;
      this.shouldResetScreen = true;
      
      // We purposefully don't reconstruct previous/operation/current individual fields
      // because buildExpressionTokens will prefer inputHistory if it exists.
      // This effectively "snapshots" the loaded state.
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
      // Sort by newest? Or alphabetical? Let's keep newest first if we unshift, or just push.
      // Let's sort by timestamp desc for display usually.
      this.variables.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getVariables(): SavedVariable[] {
      return this.variables;
  }

  public deleteVariable(label: string): void {
      this.variables = this.variables.filter(v => v.label !== label);
  }

  public inputVariable(variable: SavedVariable): void {
      // Treat as inputting a number, but also set the label
      this.inputDigit(variable.value); // This handles the value input logic (reset screen etc)
      
      this.currentValue = variable.value;
      this.currentLabel = variable.label;
      this.currentUnit = variable.unit || null;
      this.currentColor = variable.color || null;
      this.shouldResetScreen = false; // User is "editing" this value effectively, or it is a set value.
      // If we want to allow immediate operation after, this is fine.
  }

  private buildExpressionTokens(forHistory: boolean = false): ExpressionToken[] {
      const tokens: ExpressionToken[] = [];
      
      // If we have accumulated input history, use that instead
      if (this.inputHistory.length > 0) {
          const tokens = [...this.inputHistory];
          
          // Add current value if user is typing (not reset screen)
          if (!this.shouldResetScreen && this.currentValue !== '0') {
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
      
      // Add Previous (Token 1)
      if (this.previousValue !== null) {
          const unitStr = this.previousUnit ? this.previousUnit : '';
          tokens.push({
              type: 'operand',
              value: this.previousValue,
              label: this.previousLabel || undefined,
              unit: this.previousUnit || undefined,
              numberLabel: this.formatNumber(this.previousValue) + (this.previousUnit ? ` ${this.previousUnit}` : ''),
              nameLabel: this.previousLabel || undefined,
              color: this.previousColor || undefined,
              id: 'previous'
          });
      }

      // Add Operator
      if (this.operation !== null) {
          tokens.push({
              type: 'operator',
              value: this.operation
          });
      }

      // Add Current (Token 2) - logic: show if we have an op OR if it's the only thing (but typically "1 *" shows previous and op).
      // If we have previous & op, we definitely show current buffer as the second operand (live update)
      // If we ONLY have current (initial state), we show it?
      // User request: "1 * 2" -> show "1 * 2" immediately.
      // Logic: If op exists, we are entering the second operand.
      if (this.previousValue) {
           // We are in second operand phase.
           // Only show current value if we have started typing it (shouldResetScreen is false)
           if (!this.shouldResetScreen) {
               tokens.push({
                   type: 'operand',
                   value: this.currentValue,
                   label: this.currentLabel || undefined,
                   unit: this.currentUnit || undefined,
                   numberLabel: this.formatNumber(this.currentValue) + (this.currentUnit ? ` ${this.currentUnit}` : ''),
                   nameLabel: this.currentLabel || undefined,
                   color: this.currentColor || undefined,
                   id: 'current'
               });
           }
      } else {
          // We are in first operand phase.
          // Usually sub-display is empty or shows just what's typed?
          // If the user wants to name the FIRST number, it should appear in sub-display?
          // Let's assume sub-display mirrors the full equation in progress.
          tokens.push({
               type: 'operand',
               value: this.currentValue,
               label: this.currentLabel || undefined,
               unit: this.currentUnit || undefined,
               numberLabel: this.formatNumber(this.currentValue) + (this.currentUnit ? ` ${this.currentUnit}` : ''),
               nameLabel: this.currentLabel || undefined,
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
  }

  private formatResult(num: number): string {
      const str = num.toString();
      if (str.length > 12) {
          return num.toExponential(6);
      }
      return str;
  }
}
