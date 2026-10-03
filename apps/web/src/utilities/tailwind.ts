/* eslint-disable @daldalso/sort-keys */
import type { Config } from "tailwindcss";

export const tailwindTheme = {
  colors: {
    black: "#000000",
    white: "#FFFFFF",
    transparent: "transparent",

    'gray+5': "#171717",
    'gray+4': "#2D2D2D",
    'gray+3': "#424344",
    'gray+2': "#57595B",
    'gray+1': "#6C6F73",
    gray: "#81858A",
    'gray-1': "#979BA0",
    'gray-2': "#AEB1B6",
    'gray-3': "#C5C7CB",
    'gray-4': "#E0E2E4",
    'gray-5': "#F3F4F5",

    'red+5': "#1C0707",
    'red+4': "#401010",
    'red+3': "#641818",
    'red+2': "#892020",
    'red+1': "#AE2727",
    red: "#D32E2E",
    'red-1': "#DC5252",
    'red-2': "#E47575",
    'red-3': "#EC9A9A",
    'red-4': "#F4BFBF",
    'red-5': "#FAE4E4",

    'brown+5': "#241D0F",
    'brown+4': "#453619",
    'brown+3': "#674F22",
    'brown+2': "#8C6929",
    'brown+1': "#B2842E",
    brown: "#D29D39",
    'brown-1': "#DEAF56",
    'brown-2': "#E9C279",
    'brown-3': "#F1D39C",
    'brown-4': "#F8E4C0",
    'brown-5': "#FCF4E3",

    'orange+5': "#1C1103",
    'orange+4': "#442807",
    'orange+3': "#6D400A",
    'orange+2': "#96590D",
    'orange+1': "#C07110",
    orange: "#EA8912",
    'orange-1': "#F19D37",
    'orange-2': "#F5B25F",
    'orange-3': "#F9C688",
    'orange-4': "#FBDAB2",
    'orange-5': "#FEEEDC",

    'yellow+5': "#1C1A03",
    'yellow+4': "#444007",
    'yellow+3': "#6D660A",
    'yellow+2': "#968D0D",
    'yellow+1': "#C0B410",
    yellow: "#EADC12",
    'yellow-1': "#F1E537",
    'yellow-2': "#F5EB5F",
    'yellow-3': "#F9F188",
    'yellow-4': "#FBF6B2",
    'yellow-5': "#FEFBDC",

    'green+5': "#0B1910",
    'green+4': "#183824",
    'green+3': "#235938",
    'green+2': "#2E7B4B",
    'green+1': "#379E5E",
    green: "#40C172",
    'green-1': "#5FCF8A",
    'green-2': "#7FDBA2",
    'green-3': "#A0E6BB",
    'green-4': "#C2F1D4",
    'green-5': "#E5F9ED",

    'cyan+5': "#0F332F",
    'cyan+4': "#18554E",
    'cyan+3': "#1F796E",
    'cyan+2': "#259D8F",
    'cyan+1': "#2AC3B1",
    cyan: "#3FD9C7",
    'cyan-1': "#60E2D3",
    'cyan-2': "#82EBDF",
    'cyan-3': "#A6F2E9",
    'cyan-4': "#CAF8F3",
    'cyan-5': "#F0FDFC",

    'blue+5': "#091525",
    'blue+4': "#112949",
    'blue+3': "#193E6E",
    'blue+2': "#205293",
    'blue+1': "#2666B9",
    blue: "#347BD7",
    'blue-1': "#5893DF",
    'blue-2': "#7CABE7",
    'blue-3': "#A1C3EF",
    'blue-4': "#C7DBF6",
    'blue-5': "#ECF3FC",

    'indigo+5': "#16092F",
    'indigo+4': "#250F54",
    'indigo+3': "#331679",
    'indigo+2': "#3E1D9E",
    'indigo+1': "#4824C3",
    indigo: "#5839DB",
    'indigo-1': "#735EE1",
    'indigo-2': "#9083E8",
    'indigo-3': "#AFA8EF",
    'indigo-4': "#D0CDF6",
    'indigo-5': "#F2F2FD",

    'purple+5': "#160B1E",
    'purple+4': "#2F163F",
    'purple+3': "#472161",
    'purple+2': "#602B83",
    'purple+1': "#7834A5",
    purple: "#9041C5",
    'purple-1': "#A462D0",
    'purple-2': "#B883DC",
    'purple-3': "#CCA5E6",
    'purple-4': "#E0C7F0",
    'purple-5': "#F3EAFA",

    'pink+5': "#1D0C13",
    'pink+4': "#3C1928",
    'pink+3': "#5C253C",
    'pink+2': "#7D3150",
    'pink+1': "#9E3C65",
    pink: "#BC4A7A",
    'pink-1': "#C96991",
    'pink-2': "#D689A9",
    'pink-3': "#E2A9C1",
    'pink-4': "#EECAD9",
    'pink-5': "#F9EBF1"
  },
  fontSize: {
    h1: [ '3rem', '4.5rem' ],
    h2: [ '2.5rem', '3.75rem' ],
    h3: [ '2rem', '3rem' ],
    h4: [ '1.5rem', '2.25rem' ],
    h5: [ '1.3rem', '1.75rem' ],
    b1: [ '1.15rem', '1.625rem' ],
    b2: [ '0.9375rem', '1.375rem' ],
    b3: [ '0.8125rem', '1.25rem' ],
    b4: [ '0.75rem', '1.125rem' ],
    b5: [ '0.6875rem', '1rem' ]
  },
  boxShadow: {},
  boxShadowColor: {},
  dropShadow: {},
  borderRadius: {
    0: "0",
    xs: "0.125rem",
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    '2xl': "1.5rem",
    full: "9999px",
    circle: "50%"
  },
  blur: {
    DEFAULT: "1px",
    0: "0",
    xs: "2px",
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px"
  },
  animation: {},
  extend: {
    spacing: {
      '0.75': "0.1875rem",
      '15': "3.75rem"
    },
    transitionTimingFunction: {
      'bouncing': "cubic-bezier(0, 1.09, 0.59, 1.3)"
    }
  }
} satisfies Config['theme'];

type KeyOfStringValues<T extends Record<string, any>> = ({
  [key in keyof T]: T[key] extends string
    ? key
    : never
})[keyof T];
export function color(key:KeyOfStringValues<typeof tailwindTheme.colors>, opacity:number = 1):string{
  const suffix = opacity >= 1 ? "" : Math.max(0, Math.round(opacity * 255)).toString(16).padStart(2, "0");

  return tailwindTheme.colors[key] + suffix;
}