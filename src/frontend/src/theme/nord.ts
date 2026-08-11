import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Nord palette expressed as Mantine color tuples (index 6 = base token).
const nordBlue: MantineColorsTuple = [
  '#eef2f8', '#dde4ef', '#b3c4dd', '#889fca', '#6a86bc', '#5e81ac',
  '#5578a5', '#456391', '#3a557f', '#2c476d',
];
const nordFrost: MantineColorsTuple = [
  '#eef8fb', '#dcf0f5', '#b5e0eb', '#8dd0e0', '#88c0d0', '#7cb6c8',
  '#6aa4b6', '#548b9c', '#437587', '#2f5f70',
];
const nordTeal: MantineColorsTuple = [
  '#eef7f6', '#dcefed', '#b8dfdb', '#9fcfca', '#8fbcbb', '#82b1af',
  '#6fa09d', '#588683', '#456f6c', '#325a57',
];
const nordGreen: MantineColorsTuple = [
  '#f2f7ec', '#e5efdb', '#cbe0b8', '#b3d194', '#a3be8c', '#94b37c',
  '#7f9e66', '#647d4d', '#4c6039', '#374826',
];
const nordAmber: MantineColorsTuple = [
  '#fdf7e8', '#f8edcf', '#f1dfa4', '#ebd082', '#ebcb8b', '#e0bd6f',
  '#cfa74f', '#a9853a', '#836629', '#5f4a19',
];
const nordRed: MantineColorsTuple = [
  '#fbeef0', '#f3d9dd', '#e6b0b8', '#d98995', '#bf616a', '#b3555f',
  '#a04751', '#833840', '#672a31', '#4c1e23',
];
const nordDark: MantineColorsTuple = [
  '#d8dee9', '#c2cad8', '#a5b0c4', '#7b869b', '#4c566a', '#434c5e',
  '#3b4252', '#2e3440', '#272c38', '#1f2430',
];

export const nordTheme = createTheme({
  primaryColor: 'nordBlue',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  colors: {
    nordBlue,
    nordFrost,
    nordTeal,
    nordGreen,
    nordAmber,
    nordRed,
    dark: nordDark,
  },
  defaultRadius: 'md',
});
