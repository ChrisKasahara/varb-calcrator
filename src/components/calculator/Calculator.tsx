"use client";

import { Calculator as CalculatorLogic, ExpressionToken, HistoryItem, Operation, SavedVariable, VariableColor } from "@/lib/calculator";
import { Bookmark, History, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Forcing rebuild

export default function Calculator() {
  const  calculator = useRef(new CalculatorLogic()).current;
  const [display, setDisplay] = useState("0");
  const [displayUnit, setDisplayUnit] = useState<string | null>(null);
  const [expressionTokens, setExpressionTokens] = useState<ExpressionToken[]>([]);
  const [activeOp, setActiveOp] = useState<Operation | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [variables, setVariables] = useState<SavedVariable[]>([]);
  const [showVariables, setShowVariables] = useState(false);
  
  // To simulate "loading" a history context briefly or just show recent
  const [tempContext, setTempContext] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const updateState = () => {
    setDisplay(calculator.getDisplayValue());
    setDisplayUnit(calculator.getCurrentUnit());
    setExpressionTokens(calculator.getExpressionTokens());
    setHistory([...calculator.getHistory()]);
    setVariables([...calculator.getVariables()]);
  };

  const handleDigit = (digit: string) => {
    setTempContext(null);
    calculator.inputDigit(digit);
    updateState();
  };

  const handleOp = (op: Operation) => {
    setTempContext(null);
    calculator.setOperation(op);
    updateState();
    setActiveOp(op);
  };

  const handleEqual = () => {
    setTempContext(null);
    calculator.calculate();
    updateState();
    setActiveOp(null);
  };

  const handleClear = () => {
    setTempContext(null);
    calculator.clear();
    updateState();
    setActiveOp(null);
  };

  const handleDelete = () => {
    setTempContext(null);
    calculator.delete();
    updateState();
  };

  const handlePercent = () => {
    calculator.percentage();
    updateState();
  };
  
  const handleToggleSign = () => {
      calculator.toggleSign();
      updateState();
  };

  const handleParenthesis = (type: '(' | ')') => {
      setTempContext(null);
      calculator.inputParenthesis(type);
      updateState();
  };

  // Renaming state
  const [editingToken, setEditingToken] = useState<{ token: ExpressionToken, label: string, unit: string, color: VariableColor | null } | null>(null);
  
  const COMMON_UNITS = ["円", "個", "枚", "本", "m", "kg", "g", "L", "%"];

  const handleHistoryClick = (index: number) => {
      const item = history[index];
      calculator.loadFromHistory(index);
      
      // Generate string for context - show both name and value
      const exprStr = item.expressionTokens.map(t => {
          if (t.type === 'operator') return t.value;
          // Show both name and value if name exists
          if (t.nameLabel && t.numberLabel) {
              return `${t.nameLabel} (${t.numberLabel})`;
          }
          return t.numberLabel || t.value;
      }).join(' ') + " =";
      setTempContext(exprStr);
      
      updateState();
      setShowHistory(false);
  };

  const handleTokenClick = (token: ExpressionToken) => {
      if (token.type !== 'operand' || !token.id) return;
      setEditingToken({ 
          token, 
          label: token.label || "",
          unit: token.unit || "",
          color: token.color || null
      });
  };

  const handleMainDisplayClick = () => {
      // Check if current value is intermediate result
      if (calculator.isIntermediate()) {
          setToastMessage("暫定結果は編集できません");
          setTimeout(() => setToastMessage(null), 2000);
          return;
      }
      
      // Create a token for the current value to enable editing
      const currentToken: ExpressionToken = {
          type: 'operand',
          value: calculator.getCurrentValue(),
          label: undefined,
          unit: calculator.getCurrentUnit() || undefined,
          id: 'current'
      };
      setEditingToken({
          token: currentToken,
          label: "",
          unit: calculator.getCurrentUnit() || "",
          color: null
      });
  };

  const saveLabel = () => {
      if (!editingToken) return;
      const target = editingToken.token.id === 'current' ? 'current' : 'previous';
      calculator.setLabel(target, editingToken.label, editingToken.color);
      calculator.setUnit(target, editingToken.unit || null);
      updateState();
      setEditingToken(null);
  };

  const saveToVariables = () => {
      if (!editingToken || !editingToken.label) return; // Label is required for saving? Or maybe just value? Usually label.
      
      // Save
      calculator.saveVariable(editingToken.label, editingToken.token.value, editingToken.unit, editingToken.color || undefined);
      
      // Apply
      const target = editingToken.token.id === 'current' ? 'current' : 'previous';
      calculator.setLabel(target, editingToken.label, editingToken.color);
      calculator.setUnit(target, editingToken.unit || null);
      
      updateState();
      setEditingToken(null);
  };
  
  const handleVariableClick = (variable: SavedVariable) => {
      calculator.inputVariable(variable);
      updateState();
      setShowVariables(false);
  };

  // Keyboard support for modal
  useEffect(() => {
    if (!editingToken) return;
    const handleModalKey = (e: KeyboardEvent) => {
        // if (e.key === "Enter") saveLabel(); // Disabled as per user request
        if (e.key === "Escape") setEditingToken(null);
        e.stopPropagation(); 
    };
    window.addEventListener("keydown", handleModalKey, { capture: true }); // Capture phase to prevent calc input?
    return () => window.removeEventListener("keydown", handleModalKey, { capture: true });
  }, [editingToken]);

  // Keyboard support (Main)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingToken) return;
      
      const key = e.key;
      // ... existing logic
      if (/[0-9]/.test(key)) handleDigit(key);
      if (key === ".") handleDigit(".");
      if (key === "+" || key === "-" || key === "*" || key === "/") {
          const mappedOp = key === "*" ? "×" : key === "/" ? "÷" : key as Operation;
          handleOp(mappedOp);
      }
      if (key === "(" || key === ")") handleParenthesis(key);
      if (key === "Enter" || key === "=") {
          e.preventDefault();
          handleEqual();
      }
      if (key === "Escape") handleClear();
      if (key === "Backspace") handleDelete();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingToken]);

  const Button = ({ 
    label, 
    onClick, 
    className = "", 
    variant = "default",
    icon
  }: { 
    label?: string, 
    onClick: () => void, 
    className?: string,
    variant?: "default" | "primary" | "secondary",
    icon?: React.ReactNode
  }) => {
    // Tiled layout styles: rectangular, no gaps (handled by grid container), no roundness
    const baseStyles = "h-16 sm:h-24 w-full text-2xl font-medium transition-colors duration-200 active:bg-white/20 flex items-center justify-center select-none rounded-none";
    let variantStyles = "bg-white/5 hover:bg-white/10 text-white"; 
    
    if (variant === "primary") {
      variantStyles = "bg-orange-500 hover:bg-orange-400 text-white";
      if (activeOp === label) {
          variantStyles = "bg-white text-orange-600";
      }
    } else if (variant === "secondary") {
      variantStyles = "bg-white/10 hover:bg-white/15 text-gray-200";
    }

    return (
      <button 
        onClick={onClick}
        className={`${baseStyles} ${variantStyles} ${className}`}
      >
        {icon ? icon : label}
      </button>
    );
  };

  return (
    <div className="relative group flex gap-4 h-full w-full justify-center">
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-violet-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
      
      {/* Main Calculator */}
      {/* Main Calculator */}
      <div className="relative z-10 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl w-full sm:max-w-md h-full overflow-hidden flex flex-col">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
            {toastMessage}
          </div>
        )}
        
        {/* Naming Modal Overlay */}
        {editingToken && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in">
                <h3 className="text-white text-lg font-medium mb-4">Set Variable Details</h3>
                
                {/* Name Input */}
                <input 
                    autoFocus
                    type="text" 
                    value={editingToken.label}
                    onChange={(e) => setEditingToken({ ...editingToken, label: e.target.value })}
                    placeholder="Variable Name..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 mb-4"
                />

                {/* Color Section */}
                <div className="w-full mb-4">
                    <label className="text-white/60 text-xs mb-2 block ml-1">Color (Optional)</label>
                    <div className="flex flex-wrap gap-2">
                        {(['red', 'yellow', 'blue', 'orange', 'green', 'white'] as VariableColor[]).map(color => (
                            <button
                                key={color}
                                onClick={() => setEditingToken({ ...editingToken, color })}
                                className={`w-10 h-10 rounded-lg transition-all ${
                                    editingToken.color === color 
                                        ? 'ring-2 ring-white scale-110' 
                                        : 'hover:scale-105'
                                } ${
                                    color === 'red' ? 'bg-red-500' :
                                    color === 'yellow' ? 'bg-yellow-500' :
                                    color === 'blue' ? 'bg-blue-500' :
                                    color === 'orange' ? 'bg-orange-500' :
                                    color === 'green' ? 'bg-green-500' :
                                    'bg-white'
                                }`}
                                title={color}
                            />
                        ))}
                    </div>
                </div>

                {/* Unit Section */}
                <div className="w-full mb-6">
                    <label className="text-white/60 text-xs mb-2 block ml-1">Unit (Optional)</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {COMMON_UNITS.map(unit => (
                            <button
                                key={unit}
                                onClick={() => setEditingToken({ ...editingToken, unit })}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${editingToken.unit === unit ? 'bg-neutral-500 text-white shadow-md' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                            >
                                {unit}
                            </button>
                        ))}
                    </div>
                    <input 
                        type="text" 
                        value={editingToken.unit}
                        onChange={(e) => setEditingToken({ ...editingToken, unit: e.target.value })}
                        placeholder="Custom Unit..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neutral-500/50"
                    />
                </div>

                <div className="flex gap-3 w-full">
                    <button 
                        onClick={() => setEditingToken(null)}
                        className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                         onClick={saveToVariables}
                         className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium shadow-lg transition-colors flex items-center justify-center gap-2"
                         title="Save to list"
                    >
                        <Save size={18} />
                        <span>Save Var</span>
                    </button>
                    <button 
                        onClick={saveLabel}
                        className="flex-1 py-3 bg-neutral-500 hover:bg-neutral-400 rounded-xl text-white font-medium shadow-lg transition-colors"
                    >
                        Apply Only
                    </button>
                </div>
            </div>
        )}

        {/* Toggle Buttons (History & Variables) */}
        <div className="absolute top-4 left-4 z-20 flex gap-2">
             <button 
                onClick={() => { setShowHistory(!showHistory); setShowVariables(false); }}
                className={`p-2 rounded-full transition-colors ${showHistory ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                title="History"
             >
                 <History size={20} />
             </button>
             <button 
                onClick={() => { setShowVariables(!showVariables); setShowHistory(false); }}
                className={`p-2 rounded-full transition-colors ${showVariables ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                title="Variables"
             >
                 <Bookmark size={20} />
             </button>
        </div>

        {/* Display Area */}
        <div className="flex-1 flex flex-col p-4 sm:p-4 overflow-hidden">
           {/* Scrollable Sub-display Area (History + Current Expression) */}
           <div className="flex-1 overflow-y-auto flex flex-col-reverse gap-3 pb-2">
              {/* Current Expression */}
              <div className="text-neutral-400 text-lg font-light tracking-wide flex flex-wrap items-end justify-end gap-2 w-full">
                {tempContext ? (
                    <span className="text-neutral-400 fade-in self-center">{tempContext}</span>
                ) : (
                   expressionTokens.map((token, i) => (
                       <span 
                           key={i} 
                           onClick={() => handleTokenClick(token)}
                           className={`visited: transition-colors cursor-pointer select-none flex flex-col items-center justify-end group/token ${token.type === 'operand' ? 'hover:text-white' : ''}`}
                           title={token.type === 'operand' ? "Click to name" : ""}
                       >
                           {/* Token Label (Sub-monitor Top) */}
                           {token.nameLabel && (
                               <span className={`text-xs leading-none mb-0.5 font-medium ${
                                   token.color === 'red' ? 'text-red-400/80' :
                                   token.color === 'yellow' ? 'text-yellow-400/80' :
                                   token.color === 'blue' ? 'text-blue-400/80' :
                                   token.color === 'orange' ? 'text-orange-400/80' :
                                   token.color === 'green' ? 'text-green-400/80' :
                                   token.color === 'white' ? 'text-white/80' :
                                   'text-neutral-300/80'
                               }`}>{token.nameLabel}</span>
                           )}

                           {/* Token Value/Number Label (Sub-monitor Bottom) */}
                           <span className={`${token.type === 'operand' ? 'border-b border-transparent group-hover/token:border-white/20' : ''} ${
                               token.color === 'red' ? 'text-red-400' :
                               token.color === 'yellow' ? 'text-yellow-400' :
                               token.color === 'blue' ? 'text-blue-400' :
                               token.color === 'orange' ? 'text-orange-400' :
                               token.color === 'green' ? 'text-green-400' :
                               token.color === 'white' ? 'text-white' :
                               ''
                           }`}>
                                {token.numberLabel || token.value}
                           </span>
                       </span>
                   ))
                )}
              </div>
              
              {/* History Items */}
              {history.map((item, idx) => (
                <div key={idx} className="text-neutral-500 text-sm font-light tracking-wide flex flex-wrap items-end justify-end gap-2 w-full opacity-60 border-b border-white/5 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0">
                  {item.expressionTokens.map((token, i) => (
                    <span key={i} className="flex flex-col items-center justify-end">
                      {token.nameLabel && (
                        <span className={`text-xs leading-none mb-0.5 ${
                            token.color === 'red' ? 'text-red-400/60' :
                            token.color === 'yellow' ? 'text-yellow-400/60' :
                            token.color === 'blue' ? 'text-blue-400/60' :
                            token.color === 'orange' ? 'text-orange-400/60' :
                            token.color === 'green' ? 'text-green-400/60' :
                            token.color === 'white' ? 'text-white/60' :
                            'text-neutral-300/60'
                        }`}>{token.nameLabel}</span>
                      )}
                      <span className={`${
                          token.color === 'red' ? 'text-red-400/60' :
                          token.color === 'yellow' ? 'text-yellow-400/60' :
                          token.color === 'blue' ? 'text-blue-400/60' :
                          token.color === 'orange' ? 'text-orange-400/60' :
                          token.color === 'green' ? 'text-green-400/60' :
                          token.color === 'white' ? 'text-white/60' :
                          ''
                      }`}>{token.numberLabel || token.value}</span>
                    </span>
                  ))}
                  <span className="text-white/40">= {item.result}</span>
                </div>
              ))}
           </div>
           
           {/* Main Display (Fixed at bottom) */}
           <div className="w-full text-right pt-2 border-t border-white/5">
               <span 
                   onClick={handleMainDisplayClick}
                   className={`text-4xl sm:text-5xl font-light tracking-tight drop-shadow-md animate-fade-in-up break-all line-clamp-2 leading-tight transition-colors ${
                       calculator.isIntermediate() 
                           ? 'text-neutral-400 cursor-default' 
                           : 'text-white cursor-pointer hover:text-white/80'
                   }`}
               >
                 {display}
                 {displayUnit && <span className="text-2xl text-white/50 font-normal ml-2">{displayUnit}</span>}
               </span>
           </div>
        </div>

        {/* Keypad */}
        {/* Keypad - Tiled Layout */}
        <div className="grid grid-cols-4 gap-[1px] bg-white/5 p-[1px]">
          <Button label="AC" onClick={handleClear} variant="secondary" />
          <Button label="(" onClick={() => handleParenthesis('(')} variant="secondary" />
          <Button label=")" onClick={() => handleParenthesis(')')} variant="secondary" />
          <Button label="÷" onClick={() => handleOp("÷")} variant="primary" />

          <Button label="7" onClick={() => handleDigit("7")} />
          <Button label="8" onClick={() => handleDigit("8")} />
          <Button label="9" onClick={() => handleDigit("9")} />
          <Button label="×" onClick={() => handleOp("×")} variant="primary" />

          <Button label="4" onClick={() => handleDigit("4")} />
          <Button label="5" onClick={() => handleDigit("5")} />
          <Button label="6" onClick={() => handleDigit("6")} />
          <Button label="-" onClick={() => handleOp("-")} variant="primary" />

          <Button label="1" onClick={() => handleDigit("1")} />
          <Button label="2" onClick={() => handleDigit("2")} />
          <Button label="3" onClick={() => handleDigit("3")} />
          <Button label="+" onClick={() => handleOp("+")} variant="primary" />

          <Button label="0" onClick={() => handleDigit("0")} />
          <Button label="." onClick={() => handleDigit(".")} />
          <Button label="+/-" onClick={handleToggleSign} />
          <Button label="=" onClick={handleEqual} variant="primary" />
        </div>
      </div>



      {/* History Panel */}
      <div className={`
          absolute sm:static top-0 right-0 h-full w-full sm:w-64 
          bg-black/60 sm:bg-black/20 backdrop-blur-xl sm:backdrop-blur-md 
          rounded-[2rem] border border-white/10 p-6 shadow-2xl 
          transition-all duration-300 ease-in-out z-20 overflow-hidden flex flex-col
          ${showHistory ? 'translate-x-0 opacity-100 sm:ml-4' : 'translate-x-10 opacity-0 pointer-events-none w-0 p-0 border-0'}
      `}>
           <div className="flex items-center justify-between mb-4 text-white/80 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <History size={18} />
                <span className="font-medium">History</span>
              </div>
              {/* Mobile Close Button */}
              <button 
                onClick={() => setShowHistory(false)}
                className="sm:hidden p-1 text-white/50 hover:text-white transition-colors"
              >
                  <X size={20} />
              </button>
           </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {history.length === 0 ? (
                  <div className="text-white/30 text-center py-8 text-sm">No history yet</div>
              ) : (
                  history.map((item, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleHistoryClick(i)}
                        className="flex flex-col items-end w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-right group/item"
                      >
                          <span className="text-neutral-400 text-xs mb-1 group-hover/item:text-neutral-300 transition-colors">
                            {item.expressionTokens.map(t => {
                                if (t.nameLabel && t.numberLabel) {
                                    return `${t.nameLabel} (${t.numberLabel})`;
                                }
                                return t.nameLabel || t.numberLabel || t.value;
                            }).join(' ')} =
                          </span>
                          <span className="text-white font-medium text-lg">{item.result}</span>
                      </button>
                  ))
              )}
          </div>
      </div>

      {/* Variables Panel */}
      <div className={`
          absolute sm:static top-0 right-0 h-full w-full sm:w-64 
          bg-black/60 sm:bg-black/20 backdrop-blur-xl sm:backdrop-blur-md 
          rounded-[2rem] border border-white/10 p-6 shadow-2xl 
          transition-all duration-300 ease-in-out z-20 overflow-hidden flex flex-col
          ${showVariables ? 'translate-x-0 opacity-100 sm:ml-4' : 'translate-x-10 opacity-0 pointer-events-none w-0 p-0 border-0'}
      `}>
           <div className="flex items-center justify-between mb-4 text-white/80 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                  <Bookmark size={18} />
                  <span className="font-medium">Variables</span>
              </div>
              {/* Mobile Close Button */}
              <button 
                onClick={() => setShowVariables(false)}
                className="sm:hidden p-1 text-white/50 hover:text-white transition-colors"
                title="Close"
              >
                  <X size={20} />
              </button>
           </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {variables.length === 0 ? (
                  <div className="text-white/30 text-center py-8 text-sm">No variables saved</div>
              ) : (
                  variables.map((v, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleVariableClick(v)}
                        className="flex flex-col items-end w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-right group/item"
                      >
                          <span className="text-neutral-300 text-sm font-medium mb-1 group-hover/item:text-neutral-200 transition-colors">
                            {v.label}{v.unit ? ` (${v.unit})` : ''}
                          </span>
                          <span className="text-white/80 text-lg break-all">
                              {v.value}{v.unit ? ` ${v.unit}` : ''}
                          </span>
                      </button>
                  ))
              )}
          </div>
      </div>

    </div>
  );
}
