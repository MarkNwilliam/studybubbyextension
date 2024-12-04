import { Rect, Image as KonvaImage } from 'react-konva';

const CanvasBackground = ({ backgroundImage, canvasBackground }) => {
  return backgroundImage ? (
    <KonvaImage image={backgroundImage} width={800} height={600} />
  ) : (
    <Rect x={0} y={0} width={800} height={600} fill={canvasBackground} />
  );
};

export default CanvasBackground;
