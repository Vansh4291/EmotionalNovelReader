import 'package:flutter/material.dart';

import '../../domain/entities/highlight_entity.dart';

class HighlightColorPicker extends StatelessWidget {
  const HighlightColorPicker({
    super.key,
    required this.selectedColor,
    required this.onColorSelected,
    this.colors = HighlightEntity.standardColors,
  });

  final int selectedColor;
  final ValueChanged<int> onColorSelected;
  final List<int> colors;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: colors.map((colorValue) {
        final isSelected = selectedColor == colorValue;
        return InkWell(
          onTap: () => onColorSelected(colorValue),
          borderRadius: BorderRadius.circular(20),
          child: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Color(colorValue),
              shape: BoxShape.circle,
              border: Border.all(
                color: isSelected ? Colors.black87 : Colors.black26,
                width: isSelected ? 2.5 : 1.0,
              ),
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.15),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ]
                  : null,
            ),
            child: isSelected
                ? const Icon(Icons.check, size: 20, color: Colors.black87)
                : null,
          ),
        );
      }).toList(),
    );
  }
}
