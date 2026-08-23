import 'package:flutter/material.dart';

const _forest = Color(0xFF143D36);
const _lime = Color(0xFFD4F59B);
const _canvas = Color(0xFFF8F8F6);

final coursewiseTheme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(seedColor: _forest, brightness: Brightness.light).copyWith(
    primary: _forest,
    onPrimary: Colors.white,
    secondary: _lime,
    surface: Colors.white,
  ),
  scaffoldBackgroundColor: _canvas,
  textTheme: const TextTheme(
    headlineMedium: TextStyle(fontSize: 30, fontWeight: FontWeight.w700, letterSpacing: -0.8),
    titleLarge: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
    titleMedium: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
    bodyMedium: TextStyle(fontSize: 14, height: 1.5),
  ),
  cardTheme: CardThemeData(
    color: Colors.white,
    elevation: 0,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24), side: const BorderSide(color: Color(0xFFE7E5E4))),
  ),
  appBarTheme: const AppBarTheme(backgroundColor: _canvas, elevation: 0, surfaceTintColor: Colors.transparent),
);
