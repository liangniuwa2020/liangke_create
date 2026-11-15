import React from 'react';

export const Ionicons = ({ name, size, color: _color, style }) =>
  React.createElement(
    'i',
    { 'data-icon': name || '', 'data-size': String(size == null ? '' : size), style },
    name ? '#' : null
  );

export const MaterialIcons = Ionicons;
export const FontAwesome = Ionicons;
export const MaterialCommunityIcons = Ionicons;

export default { Ionicons, MaterialIcons, FontAwesome, MaterialCommunityIcons };
