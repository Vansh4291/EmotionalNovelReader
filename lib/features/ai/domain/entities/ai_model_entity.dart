class AiModelEntity {
  const AiModelEntity({
    required this.id,
    required this.name,
    required this.version,
    required this.parameterSize,
    required this.quantization,
    required this.fileSizeBytes,
    required this.filePath,
    required this.sha256,
    required this.license,
    this.sourceUrl,
    this.isDownloaded = false,
    this.isLoaded = false,
    this.recommendedMinRamGb = 4,
  });

  final String id;
  final String name;
  final String version;
  final String parameterSize;
  final String quantization;
  final int fileSizeBytes;
  final String filePath;
  final String sha256;
  final String license;
  final String? sourceUrl;
  final bool isDownloaded;
  final bool isLoaded;
  final int recommendedMinRamGb;

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'version': version,
    'parameterSize': parameterSize,
    'quantization': quantization,
    'fileSizeBytes': fileSizeBytes,
    'filePath': filePath,
    'sha256': sha256,
    'license': license,
    'sourceUrl': sourceUrl,
    'isDownloaded': isDownloaded,
    'isLoaded': isLoaded,
    'recommendedMinRamGb': recommendedMinRamGb,
  };

  factory AiModelEntity.fromJson(Map<String, dynamic> json) => AiModelEntity(
    id: json['id'] as String,
    name: json['name'] as String,
    version: json['version'] as String? ?? '1.0',
    parameterSize: json['parameterSize'] as String? ?? '1B',
    quantization: json['quantization'] as String? ?? 'Q4_K_M',
    fileSizeBytes: json['fileSizeBytes'] as int? ?? 0,
    filePath: json['filePath'] as String? ?? '',
    sha256: json['sha256'] as String? ?? '',
    license: json['license'] as String? ?? 'Open Source',
    sourceUrl: json['sourceUrl'] as String?,
    isDownloaded: json['isDownloaded'] as bool? ?? false,
    isLoaded: json['isLoaded'] as bool? ?? false,
    recommendedMinRamGb: json['recommendedMinRamGb'] as int? ?? 4,
  );

  AiModelEntity copyWith({
    String? id,
    String? name,
    String? version,
    String? parameterSize,
    String? quantization,
    int? fileSizeBytes,
    String? filePath,
    String? sha256,
    String? license,
    String? sourceUrl,
    bool? isDownloaded,
    bool? isLoaded,
    int? recommendedMinRamGb,
  }) {
    return AiModelEntity(
      id: id ?? this.id,
      name: name ?? this.name,
      version: version ?? this.version,
      parameterSize: parameterSize ?? this.parameterSize,
      quantization: quantization ?? this.quantization,
      fileSizeBytes: fileSizeBytes ?? this.fileSizeBytes,
      filePath: filePath ?? this.filePath,
      sha256: sha256 ?? this.sha256,
      license: license ?? this.license,
      sourceUrl: sourceUrl ?? this.sourceUrl,
      isDownloaded: isDownloaded ?? this.isDownloaded,
      isLoaded: isLoaded ?? this.isLoaded,
      recommendedMinRamGb: recommendedMinRamGb ?? this.recommendedMinRamGb,
    );
  }
}
