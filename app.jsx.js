 --- Icon shims: emoji-based stand-ins for lucide-react icons (no bundler needed) ---
function makeIcon(char) {
  return function Icon({ size = 16, color, className, onClick, style }) {
    return React.createElement(
      'span',
      { onClick,
