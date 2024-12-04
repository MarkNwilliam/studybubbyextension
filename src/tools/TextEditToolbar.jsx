import React, { useState, useEffect } from 'react';

const TextEditToolbar = ({ 
  editingText, 
  texts, 
  setTexts, 
  inputValue, 
  setInputValue 
}) => {
  const fontFamilies = [
    'Arial', 'Helvetica', 'Times New Roman', 
    'Courier New', 'Verdana', 'Georgia'
  ];

  const fontSizes = [12, 16, 20, 24, 32, 40, 48, 64];

  const [fontSize, setFontSize] = useState(editingText?.fontSize || 24);
  const [fontFamily, setFontFamily] = useState(editingText?.fontFamily || 'Arial');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  // Update text styles whenever these change
  useEffect(() => {
    if (!editingText || editingText.index === undefined) return;

    const updatedTexts = [...texts];
    const textToUpdate = updatedTexts[editingText.index];

    if (!textToUpdate) return;

    // Update text properties
    textToUpdate.fontSize = fontSize;
    textToUpdate.fontFamily = fontFamily;
    
    // Set font style
    let fontStyle = 'normal';
    if (isBold && isItalic) fontStyle = 'bold italic';
    else if (isBold) fontStyle = 'bold';
    else if (isItalic) fontStyle = 'italic';

    textToUpdate.fontStyle = fontStyle;

    // Update texts state
    setTexts(updatedTexts);
  }, [fontSize, fontFamily, isBold, isItalic, editingText]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex items-center space-x-4">
      {/* Font Family Dropdown */}
      <select 
        value={fontFamily}
        onChange={(e) => setFontFamily(e.target.value)}
        className="border rounded p-1"
      >
        {fontFamilies.map(family => (
          <option key={family} value={family}>{family}</option>
        ))}
      </select>

      {/* Font Size Dropdown */}
      <select 
        value={fontSize}
        onChange={(e) => setFontSize(Number(e.target.value))}
        className="border rounded p-1"
      >
        {fontSizes.map(size => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>

      {/* Bold Toggle */}
      <button 
        onClick={() => setIsBold(!isBold)}
        className={`p-1 border rounded ${isBold ? 'bg-blue-200' : ''}`}
      >
        B
      </button>

      {/* Italic Toggle */}
      <button 
        onClick={() => setIsItalic(!isItalic)}
        className={`p-1 border rounded ${isItalic ? 'bg-blue-200' : ''}`}
      >
        I
      </button>
    </div>
  );
};

export default TextEditToolbar;