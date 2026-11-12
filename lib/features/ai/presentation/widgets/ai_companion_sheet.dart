import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../cubit/ai_chat_cubit.dart';
import '../cubit/ai_chat_state.dart';

class AiCompanionSheet extends StatefulWidget {
  const AiCompanionSheet({super.key, required this.currentChapterExcerpt});

  final String? currentChapterExcerpt;

  static Future<void> show({
    required BuildContext context,
    required AiChatCubit cubit,
    String? currentChapterExcerpt,
  }) {
    cubit.refreshModelStatus();
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BlocProvider.value(
        value: cubit,
        child: AiCompanionSheet(currentChapterExcerpt: currentChapterExcerpt),
      ),
    );
  }

  @override
  State<AiCompanionSheet> createState() => _AiCompanionSheetState();
}

class _AiCompanionSheetState extends State<AiCompanionSheet> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _sendMessage(AiChatCubit cubit) {
    final text = _inputController.text.trim();
    if (text.isEmpty) return;
    _inputController.clear();
    cubit.askQuestion(
      query: text,
      currentChapterExcerpt: widget.currentChapterExcerpt,
    );
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: BlocConsumer<AiChatCubit, AiChatState>(
        listener: (context, state) {
          if (state.errorMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage!),
                backgroundColor: colorScheme.error,
              ),
            );
          }
          if (state.isGenerating || state.messages.isNotEmpty) {
            _scrollToBottom();
          }
        },
        builder: (context, state) {
          final cubit = context.read<AiChatCubit>();

          return Column(
            children: [
              // Drag Handle
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 8),

              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Icon(
                      Icons.auto_awesome_rounded,
                      color: colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Reading Companion',
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          Row(
                            children: [
                              Icon(
                                Icons.shield_outlined,
                                size: 14,
                                color: Colors.green.shade700,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Spoiler Boundary: Ch. ${state.currentChapterIndex + 1}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.green.shade700,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              if (state.activeModelName != null) ...[
                                Text(
                                  ' • ',
                                  style: TextStyle(
                                    color: colorScheme.onSurfaceVariant,
                                  ),
                                ),
                                Text(
                                  state.activeModelName!,
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    if (state.isCloudAvailable)
                      ActionChip(
                        avatar: Icon(
                          state.isCloudMode
                              ? Icons.cloud_outlined
                              : Icons.memory_outlined,
                          size: 16,
                        ),
                        label: Text(state.isCloudMode ? 'Cloud' : 'Local'),
                        onPressed: () {
                          cubit.toggleCloudMode(!state.isCloudMode);
                        },
                      ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Chat Messages
              Expanded(
                child: state.messages.isEmpty && !state.isGenerating
                    ? _buildEmptyState(context, cubit)
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount:
                            state.messages.length +
                            (state.isGenerating ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index < state.messages.length) {
                            return _buildMessageBubble(
                              context,
                              state.messages[index],
                            );
                          } else {
                            return _buildStreamingBubble(
                              context,
                              state.streamingResponse,
                            );
                          }
                        },
                      ),
              ),

              // Quick prompt chips
              if (!state.isGenerating)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 4,
                  ),
                  child: Row(
                    children: [
                      _buildPromptChip('Character analysis', cubit),
                      const SizedBox(width: 8),
                      _buildPromptChip('Emotional tone of this scene', cubit),
                      const SizedBox(width: 8),
                      _buildPromptChip('Recap story up to this chapter', cubit),
                    ],
                  ),
                ),

              // Input Bar
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _inputController,
                        decoration: InputDecoration(
                          hintText: state.hasModelLoaded
                              ? 'Ask about characters, themes, scenes...'
                              : 'Load an AI model in Settings first',
                          enabled: state.hasModelLoaded && !state.isGenerating,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                          ),
                        ),
                        onSubmitted: (_) => _sendMessage(cubit),
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (state.isGenerating)
                      IconButton.filled(
                        style: IconButton.styleFrom(
                          backgroundColor: colorScheme.error,
                        ),
                        icon: const Icon(Icons.stop_rounded),
                        onPressed: () => cubit.cancelGeneration(),
                      )
                    else
                      IconButton.filled(
                        icon: const Icon(Icons.arrow_upward_rounded),
                        onPressed: state.hasModelLoaded
                            ? () => _sendMessage(cubit)
                            : null,
                      ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, AiChatCubit cubit) {
    final colorScheme = Theme.of(context).colorScheme;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.psychology_outlined,
              size: 48,
              color: colorScheme.primary,
            ),
            const SizedBox(height: 12),
            Text(
              'Grounded Literary Companion',
              style: Theme.of(context).textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              'Ask anything about characters, themes, and narrative atmosphere. All answers strictly respect your current reading position without future spoilers.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPromptChip(String prompt, AiChatCubit cubit) {
    return ActionChip(
      label: Text(prompt, style: const TextStyle(fontSize: 12)),
      onPressed: () {
        _inputController.text = prompt;
        _sendMessage(cubit);
      },
    );
  }

  Widget _buildMessageBubble(BuildContext context, AiChatMessage msg) {
    final colorScheme = Theme.of(context).colorScheme;
    final isUser = msg.isUser;

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.8,
        ),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isUser
              ? colorScheme.primary
              : colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              msg.text,
              style: TextStyle(
                color: isUser ? colorScheme.onPrimary : colorScheme.onSurface,
                height: 1.4,
              ),
            ),
            if (!isUser) ...[
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: msg.isCloud
                      ? Colors.purple.withAlpha(30)
                      : Colors.blue.withAlpha(30),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  msg.isCloud ? 'Cloud AI' : 'On-Device GGUF',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: msg.isCloud ? Colors.purple : Colors.blue.shade700,
                  ),
                ),
              ),
            ],
            if (!isUser && msg.referencedPassages.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: msg.referencedPassages.take(3).map((p) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: colorScheme.surface,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: colorScheme.outlineVariant),
                    ),
                    child: Text(
                      'Ch. ${p.chapterIndex + 1}: ${p.chapterTitle}',
                      style: TextStyle(
                        fontSize: 10,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStreamingBubble(BuildContext context, String currentText) {
    final colorScheme = Theme.of(context).colorScheme;

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.8,
        ),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          currentText.isEmpty ? 'Thinking...' : currentText,
          style: TextStyle(
            color: colorScheme.onSurface,
            height: 1.4,
            fontStyle: currentText.isEmpty
                ? FontStyle.italic
                : FontStyle.normal,
          ),
        ),
      ),
    );
  }
}
