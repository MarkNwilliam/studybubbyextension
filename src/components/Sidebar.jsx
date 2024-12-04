import React, { useState } from 'react';
import { ChromePicker } from 'react-color';
import { Type, Square, Circle as CircleIcon, Image, PaletteIcon, Menu } from 'lucide-react';

const Sidebar = ({
  tool,
  setTool,
  currentColor,
  setCurrentColor,
  canvasBackground,
  setCanvasBackground,
  addTextElement,
  handleBackgroundImageUpload,
  strokeWidth,
  setStrokeWidth,
  fileInputRef,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'w-64' : 'w-16'
      } bg-gray-100 p-4 space-y-4 relative`}
    >
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-2 right-2 bg-gray-200 p-2 rounded-full"
      >
        <Menu size={20} />
      </button>
      {sidebarOpen && (
        <>
          <div className="font-bold text-xl mb-4">Design Tools</div>
          <div className="space-y-2">
            <h3 className="font-semibold">Draw</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setTool('pencil')}
                className={`p-2 ${
                  tool === 'pencil' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                <Type size={20} />
              </button>
              <button
                onClick={() => setTool('rectangle')}
                className={`p-2 ${
                  tool === 'rectangle' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                <Square size={20} />
              </button>
              <button
                onClick={() => setTool('circle')}
                className={`p-2 ${
                  tool === 'circle' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                <CircleIcon size={20} />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Text</h3>
            <button
              onClick={addTextElement}
              className="bg-gray-200 p-2 flex items-center space-x-2"
            >
              <Type size={20} /> Add Text
            </button>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Background</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="bg-gray-200 p-2"
              >
                <PaletteIcon size={20} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleBackgroundImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current.click()}
                className="bg-gray-200 p-2"
              >
                <Image size={20} />
              </button>
            </div>
            {showColorPicker && (
              <div className="absolute z-50">
                <ChromePicker
                  color={canvasBackground}
                  onChange={(color) => setCanvasBackground(color.hex)}
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Color</h3>
            <input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-full h-12"
            />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Brush Size</h3>
            <input
              type="range"
              min="1"
              max="50"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;
