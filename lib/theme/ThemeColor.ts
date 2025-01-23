export interface ColorGradient {
    _100: string
    _200: string
    _300: string
    _400: string
    _500: string
    _600: string
    _700: string
    _800: string
    _900: string
}

export interface ColorScheme {
    name: string
    primary: ColorGradient
    secondary: ColorGradient
    neutral: ColorGradient
    warning: ColorGradient
    error: ColorGradient
    text: ColorGradient
}

export namespace DefaultColorSchemes {
    export const navyBlueDark: ColorScheme = {
        name: 'NavyBlueDark',
        primary: {
            _100: '#0a0f2c',
            _200: '#121b4b',
            _300: '#1b276a',
            _400: '#233489',
            _500: '#2b41a8',
            _600: '#4359bf',
            _700: '#5b71d6',
            _800: '#7389ed',
            _900: '#8ba1ff',
        },
        secondary: {
            _100: '#1a1c33',
            _200: '#292d52',
            _300: '#383e71',
            _400: '#474f90',
            _500: '#5660af',
            _600: '#6e78c6',
            _700: '#8690dd',
            _800: '#9ea8f4',
            _900: '#b6c0ff',
        },
        neutral: {
            _100: '#121212',
            _200: '#242424',
            _300: '#363636',
            _400: '#484848',
            _500: '#5a5a5a',
            _600: '#747474',
            _700: '#8e8e8e',
            _800: '#a8a8a8',
            _900: '#c2c2c2',
        },
        warning: {
            _100: '#ffe6cc',
            _200: '#e6c099',
            _300: '#cca866',
            _400: '#b39033',
            _500: '#997800',
            _600: '#806000',
            _700: '#664800',
            _800: '#4d3600',
            _900: '#332400',
        },
        error: {
            _100: '#ff8080',
            _200: '#ee6666',
            _300: '#d34d4d',
            _400: '#b83333',
            _500: '#9c1a1a',
            _600: '#800000',
            _700: '#640000',
            _800: '#480000',
            _900: '#2c0000',
        },
        text: {
            _100: '#f4f4f4',
            _200: '#e6e6e6',
            _300: '#c8c8c8',
            _400: '#aaaaaa',
            _500: '#8c8c8c',
            _600: '#6e6e6e',
            _700: '#505050',
            _800: '#323232',
            _900: '#141414',
        },
    }
}
