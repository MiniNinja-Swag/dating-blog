import { Text, TextProps } from './Themed';

export function StyledText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: 'Rans_font-Regular', color: 'white' }]} />;
}
