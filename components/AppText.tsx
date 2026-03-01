import { Text, TextProps } from './Themed';

export function AppText(props: TextProps) {
    return <Text {...props} style={[props.style, { fontFamily: 'ArefRuqaaInk-Regular' }]} />;
}
