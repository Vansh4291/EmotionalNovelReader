import 'package:flutter/material.dart';

import '../core/constants/app_constants.dart';
import 'theme/app_theme.dart';

/// Root application widget for EmotionalNovelReader.
class EmotionalNovelReaderApp extends StatelessWidget {
  const EmotionalNovelReaderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      home: const Scaffold(
        body: Center(
          child: Text(AppConstants.appName),
        ),
      ),
    );
  }
}

