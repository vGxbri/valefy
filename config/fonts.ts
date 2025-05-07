import { Fira_Code as FontMono, Inter as FontSans, Raleway as FontRaleway } from "next/font/google";

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const fontRaleway = FontRaleway({
  subsets: ["latin"],
  variable: "--font-raleway",
});
