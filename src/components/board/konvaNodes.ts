// Componentes Konva do app. O núcleo do react-konva não traz as formas: cada import abaixo registra uma.
// Registrar só as usadas deixa o bundle menor. Uma forma nova (ex.: Arc, Star) precisa do import de
// `konva/lib/shapes/...` aqui e do nome na lista de exports. Importe daqui, nunca direto de `react-konva`.
import 'konva/lib/shapes/Circle'
import 'konva/lib/shapes/Ellipse'
import 'konva/lib/shapes/Line'
import 'konva/lib/shapes/Rect'
import 'konva/lib/shapes/Text'

export { Circle, Ellipse, Group, Layer, Line, Rect, Shape, Stage, Text } from 'react-konva/lib/ReactKonvaCore'
