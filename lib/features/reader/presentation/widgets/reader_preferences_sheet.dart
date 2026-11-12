import 'package:flutter/material.dart';

import '../../domain/entities/reader_preferences.dart';

class ReaderPreferencesSheet extends StatelessWidget {
  const ReaderPreferencesSheet({
    super.key,
    required this.preferences,
    required this.onChanged,
  });

  final ReaderPreferences preferences;
  final ValueChanged<ReaderPreferences> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurfaceVariant.withValues(
                    alpha: 0.4,
                  ),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Reader Customization',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),

            // Font Size
            Row(
              children: [
                const SizedBox(width: 90, child: Text('Font Size')),
                IconButton(
                  icon: const Icon(Icons.remove),
                  tooltip: 'Decrease font size',
                  onPressed: preferences.fontSize > 12.0
                      ? () => onChanged(
                          preferences.copyWith(
                            fontSize: preferences.fontSize - 1.0,
                          ),
                        )
                      : null,
                ),
                Expanded(
                  child: Slider(
                    value: preferences.fontSize,
                    min: 12.0,
                    max: 30.0,
                    divisions: 18,
                    label: '${preferences.fontSize.toInt()} sp',
                    onChanged: (val) =>
                        onChanged(preferences.copyWith(fontSize: val)),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add),
                  tooltip: 'Increase font size',
                  onPressed: preferences.fontSize < 30.0
                      ? () => onChanged(
                          preferences.copyWith(
                            fontSize: preferences.fontSize + 1.0,
                          ),
                        )
                      : null,
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Reader Theme Selector
            const Text('Reader Background'),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _ThemeChoiceButton(
                  title: 'System',
                  icon: Icons.brightness_auto,
                  isSelected: preferences.themeMode == ReaderThemeMode.system,
                  onTap: () => onChanged(
                    preferences.copyWith(themeMode: ReaderThemeMode.system),
                  ),
                ),
                _ThemeChoiceButton(
                  title: 'Light',
                  icon: Icons.light_mode,
                  isSelected: preferences.themeMode == ReaderThemeMode.light,
                  onTap: () => onChanged(
                    preferences.copyWith(themeMode: ReaderThemeMode.light),
                  ),
                ),
                _ThemeChoiceButton(
                  title: 'Dark',
                  icon: Icons.dark_mode,
                  isSelected: preferences.themeMode == ReaderThemeMode.dark,
                  onTap: () => onChanged(
                    preferences.copyWith(themeMode: ReaderThemeMode.dark),
                  ),
                ),
                _ThemeChoiceButton(
                  title: 'Sepia',
                  icon: Icons.wb_sunny_outlined,
                  isSelected: preferences.themeMode == ReaderThemeMode.sepia,
                  onTap: () => onChanged(
                    preferences.copyWith(themeMode: ReaderThemeMode.sepia),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ThemeChoiceButton extends StatelessWidget {
  const _ThemeChoiceButton({
    required this.title,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  final String title;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Semantics(
      button: true,
      selected: isSelected,
      label: '$title Theme',
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 72,
          height: 64,
          decoration: BoxDecoration(
            color: isSelected
                ? colorScheme.primaryContainer
                : colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? colorScheme.primary : Colors.transparent,
              width: 2,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: isSelected
                    ? colorScheme.onPrimaryContainer
                    : colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected
                      ? colorScheme.onPrimaryContainer
                      : colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
