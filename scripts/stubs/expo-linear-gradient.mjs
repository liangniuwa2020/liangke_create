import React from 'react';

export const LinearGradient = ({ children, colors, style, ...rest }) =>
  React.createElement(
    'div',
    { ...rest, style, 'data-gradient': Array.isArray(colors) ? colors.join('|') : '' },
    children
  );

export default { LinearGradient };
