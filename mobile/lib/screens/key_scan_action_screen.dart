import 'package:flutter/material.dart';

import '../services/keys_service.dart';

class KeyScanActionScreen extends StatefulWidget {
  const KeyScanActionScreen({
    super.key,
    required this.qrToken,
    this.keyName,
    this.keyStatus,
    this.keyNote,
    required this.userDisplayName,
    required this.accessToken,
    required this.onDone,
    required this.onCancel,
  });

  final String qrToken;
  final String? keyName;
  final String? keyStatus;
  final String? keyNote;
  final String userDisplayName;
  final String accessToken;
  final VoidCallback onDone;
  final VoidCallback onCancel;

  @override
  State<KeyScanActionScreen> createState() => _KeyScanActionScreenState();
}

class _KeyScanActionScreenState extends State<KeyScanActionScreen>
    with SingleTickerProviderStateMixin {
  static const Color blue = Color(0xFF145D84);

  final _keysService = KeysService();

  bool _loading = false;
  bool _loadingPreview = true;
  bool _showSuccess = false;
  String _successTitle = '';
  String _successSubtitle = '';
  String? _error;
  ScannedKeyPreview? _preview;
  late final AnimationController _successController;

  @override
  void initState() {
    super.initState();
    _successController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    if ((widget.keyName ?? '').isNotEmpty) {
      _preview = ScannedKeyPreview(
        keyCode: widget.keyName!,
        status: (widget.keyStatus ?? 'available').trim(),
        note: (widget.keyNote ?? '').trim().isEmpty ? null : widget.keyNote!.trim(),
      );
      _loadingPreview = false;
      return;
    }
    _loadPreview();
  }

  @override
  void dispose() {
    _successController.dispose();
    super.dispose();
  }

  Future<void> _loadPreview() async {
    try {
      final preview = await _keysService.fetchKeyPreviewByQrToken(
        accessToken: widget.accessToken,
        qrToken: widget.qrToken,
      );
      if (!mounted) return;
      setState(() => _preview = preview);
    } finally {
      if (mounted) {
        setState(() => _loadingPreview = false);
      }
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'available':
        return 'Available';
      case 'checked_out':
        return 'Checked Out';
      case 'maintenance':
        return 'Maintenance';
      case 'lost':
        return 'Lost';
      default:
        return status;
    }
  }

  Future<void> _submit(String action) async {
    if (_loading) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await _keysService.scanKeyEvent(
        accessToken: widget.accessToken,
        qrToken: widget.qrToken,
        action: action,
      );
      if (!mounted) return;
      setState(() {
        _showSuccess = true;
        if (action == 'taken') {
          _successTitle = 'Goodluck';
          _successSubtitle = 'Remember to give it back and scan me again :)';
        } else {
          _successTitle = 'Goodbye!';
          _successSubtitle = 'See you soon - ${widget.userDisplayName}';
        }
      });
      _successController.forward(from: 0);
      await Future<void>.delayed(const Duration(milliseconds: 2300));
      if (!mounted) return;
      widget.onDone();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F8FB),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: const Text('Scanned Key'),
        leading: IconButton(
          onPressed: _loading ? null : widget.onCancel,
          icon: const Icon(Icons.close),
        ),
      ),
      body: SafeArea(
        child: Stack(
          children: [
            ListView(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
              children: [
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 460),
                  child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x14000000),
                      blurRadius: 30,
                      offset: Offset(0, 14),
                    ),
                  ],
                ),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Align(
                      child: CircleAvatar(
                        radius: 30,
                        backgroundColor: Color(0xFFEAF3F9),
                        child: Icon(Icons.key_rounded, color: blue, size: 30),
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Choose action for this key',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'This action updates key status in real time.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Color(0xFF5F6B7A),
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF6F8FA),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFDCE3EA)),
                      ),
                      child: _loadingPreview
                          ? const Center(
                              child: SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            )
                          : Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Key Name: ${_preview?.keyCode ?? 'Unknown key'}',
                                  style: const TextStyle(
                                    color: Color(0xFF425466),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Status: ${_statusLabel(_preview?.status ?? 'available')}',
                                  style: const TextStyle(
                                    color: Color(0xFF425466),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                if ((_preview?.note ?? '').isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Note: ${_preview!.note!}',
                                    style: const TextStyle(
                                      color: Color(0xFF425466),
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                    ),
                    if (!_loadingPreview && _preview == null) ...[
                      const SizedBox(height: 8),
                      const Text(
                        'Key details not found for this QR.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Color(0xFFB33232),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    SizedBox(
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _loading ? null : () => _submit('taken'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: blue,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(_loading ? 'Processing...' : 'Take It'),
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 52,
                      child: OutlinedButton(
                        onPressed: _loading ? null : () => _submit('returned'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: blue,
                          side: const BorderSide(color: Color(0xFF8EA7BA)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text('Give It Back'),
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Color(0xFFB33232),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                    ],
                  ),
                ),
                ),
              ],
            ),
            if (_showSuccess)
              Positioned.fill(
                child: Container(
                  color: const Color(0xD9000000),
                  child: Center(
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0.82, end: 1),
                      duration: const Duration(milliseconds: 320),
                      curve: Curves.easeOutBack,
                      builder: (context, scale, child) => Transform.scale(
                        scale: scale,
                        child: child,
                      ),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 28),
                        padding: const EdgeInsets.fromLTRB(22, 24, 22, 22),
                        decoration: BoxDecoration(
                          color: const Color(0xFF111827),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            AnimatedBuilder(
                              animation: _successController,
                              builder: (context, _) => SizedBox(
                                width: 72,
                                height: 72,
                                child: CustomPaint(
                                  painter: _SuccessBadgePainter(
                                    progress: _successController.value,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              _successTitle,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 26,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _successSubtitle,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Color(0xFFD1D5DB),
                                fontSize: 15,
                                height: 1.3,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SuccessBadgePainter extends CustomPainter {
  _SuccessBadgePainter({required this.progress});

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    final bgPaint = Paint()
      ..color = const Color(0xFF163120)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, radius, bgPaint);

    final ringPaint = Paint()
      ..color = const Color(0xFF22C55E)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;
    const start = -1.57079632679;
    final sweep = 6.28318530718 * progress.clamp(0, 1);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius - 3),
      start,
      sweep,
      false,
      ringPaint,
    );

    final checkProgress = ((progress - 0.45) / 0.55).clamp(0, 1);
    if (checkProgress <= 0) return;

    final checkPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final p1 = Offset(size.width * 0.30, size.height * 0.54);
    final p2 = Offset(size.width * 0.45, size.height * 0.68);
    final p3 = Offset(size.width * 0.72, size.height * 0.38);

    if (checkProgress < 0.5) {
      final t = checkProgress / 0.5;
      final mid = Offset(
        p1.dx + (p2.dx - p1.dx) * t,
        p1.dy + (p2.dy - p1.dy) * t,
      );
      canvas.drawLine(p1, mid, checkPaint);
      return;
    }

    canvas.drawLine(p1, p2, checkPaint);
    final t = (checkProgress - 0.5) / 0.5;
    final end = Offset(
      p2.dx + (p3.dx - p2.dx) * t,
      p2.dy + (p3.dy - p2.dy) * t,
    );
    canvas.drawLine(p2, end, checkPaint);
  }

  @override
  bool shouldRepaint(covariant _SuccessBadgePainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
