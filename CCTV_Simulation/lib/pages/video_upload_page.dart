import 'dart:convert';
import 'dart:io';

import 'package:chewie/chewie.dart';
import 'package:flutter/material.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:lottie/lottie.dart';
import 'package:video_player/video_player.dart';

class VideoUploadPage extends StatefulWidget {
  final String location;
  final String coordinates;

  const VideoUploadPage(this.location, this.coordinates, {super.key});

  @override
  VideoUploadPageState createState() => VideoUploadPageState();
}

class VideoUploadPageState extends State<VideoUploadPage> {
  String oversampledCrop = "center_crop";
  File? videoFile;
  VideoPlayerController? _videoController;
  bool? anomalyDetected;
  String serverUrl = 'http://192.168.184.53:5005/analyze';
  double videoDuration = 0.0;
  bool isLoading = false;

  // Pick a video from the gallery
  Future<void> _pickVideo() async {
    setState(() {
      anomalyDetected = null;
    });
    final pickedFile =
        await ImagePicker().pickVideo(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() {
        videoFile = File(pickedFile.path);
        _videoController?.dispose();
        _videoController = VideoPlayerController.file(videoFile!)
          ..initialize().then((_) {
            setState(() {
              videoDuration =
                  _videoController!.value.duration.inSeconds.toDouble();
            });
            _videoController!.play();
          });
      });
    }
  }

  // Upload the video to the server
  Future<void> _uploadVideo() async {
    if (videoFile == null) return;

    // Store context before async operations
    final scaffoldMessenger = ScaffoldMessenger.of(context);


    setState(() {
      isLoading = true;
    });

    try {
      var request = http.MultipartRequest('POST', Uri.parse(serverUrl));
      request.files
          .add(await http.MultipartFile.fromPath('video', videoFile!.path));
      request.fields['location'] = widget.location;
      request.fields['coordinates'] = widget.coordinates;
      request.fields['anomalyDate'] = DateTime.now().toString().split(" ")[0];
      request.fields['anomalyTime'] = '${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')}';
      request.fields['oversampledCrop'] = oversampledCrop;

      var response = await request.send();
      var responseData = await http.Response.fromStream(response);

      if (response.statusCode == 200) {
        var result = json.decode(responseData.body);
        setState(() {
          anomalyDetected = result['anomaly'];
        });
      } else {
        throw Exception('Failed to upload video');
      }
    } catch (e) {
      debugPrint('Error: $e');
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: const Color(0xFF6366F1).withValues(alpha: 0.9),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  // Show server settings dialog
  void _showSettingsDialog() {
    String tempUrl = serverUrl;
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: Color(0xFF1E293B),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
            side: BorderSide(color: Color(0xFF6366F1), width: 1),
          ),
          title: Text(
            'Settings',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 20,
              color: Colors.white,
            ),
          ),
          content: TextField(
            onChanged: (value) => tempUrl = value,
            controller: TextEditingController(text: serverUrl),
            style: TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: 'Server URL',
              labelStyle: TextStyle(color: Color(0xFF6366F1)),
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide:
                    BorderSide(color: const Color(0xFF6366F1).withValues(alpha: 0.5)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Color(0xFF6366F1)),
              ),
              filled: true,
              fillColor: Color(0xFF0F172A),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Cancel', style: TextStyle(color: Colors.white70)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Color(0xFF6366F1),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              onPressed: () {
                setState(() => serverUrl = tempUrl);
                Navigator.pop(context);
              },
              child: Text('Save', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    _videoController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              AppBar(
                leading: IconButton(
                  onPressed: () {
                    Get.back();
                  },
                  icon: Icon(
                    Icons.arrow_back,
                    color: Colors.white,
                  ),
                  color: Colors.white,
                ),
                backgroundColor: Colors.transparent,
                elevation: 0,
                centerTitle: true,
                title: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.settings, color: Color(0xFF6366F1), size: 24),
                    SizedBox(width: 12),
                    Text(
                      'Inference Engine',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
                actions: [
                  IconButton(
                    icon: Icon(
                      Icons.settings,
                      color: oversampledCrop == "center_crop"
                          ? Colors.white
                          : Colors.white70,
                    ),
                    onPressed: _showSettingsDialog,
                  ),
                ],
              ),
              Expanded(
                child: SingleChildScrollView(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Card(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(15),
                          ),
                          elevation: 8,
                          margin: EdgeInsets.symmetric(horizontal: 10),
                          color: Color(0xFF1E293B),
                          child: Container(
                            width: double.infinity,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(15),
                              border: Border.all(
                                  color: Color(0xFF4F46E5), width: 1),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Upload Video for Crime Detection',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF6366F1),
                                    ),
                                  ),
                                  SizedBox(height: 10),
                                  Text(
                                    'Location: ${widget.location}',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.white70,
                                    ),
                                  ),
                                  SizedBox(height: 5),
                                  Text(
                                    'Coordinates: ${widget.coordinates}',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.white70,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        SizedBox(height: 20),
                        if (videoFile != null && _videoController != null)
                          Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(15),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF6366F1).withValues(alpha: 0.3),
                                  spreadRadius: 3,
                                  blurRadius: 7,
                                  offset: Offset(0, 3),
                                ),
                              ],
                              border: Border.all(
                                color: const Color(0xFF6366F1).withValues(alpha: 0.5),
                                width: 1,
                              ),
                              color: Colors.black45,
                            ),
                            margin: EdgeInsets.symmetric(horizontal: 10),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(15),
                              child: AspectRatio(
                                aspectRatio:
                                    _videoController!.value.isInitialized
                                        ? _videoController!.value.aspectRatio
                                        : 16 / 9,
                                child: Chewie(
                                  controller: ChewieController(
                                    videoPlayerController: _videoController!,
                                    autoPlay: true,
                                    looping: false,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        if (videoFile == null)
                          Lottie.asset(
                            'assets/lottie/CustomerSupport.json',
                            height: 200,
                          ),
                        SizedBox(height: 25),
                        if (isLoading)
                          Container(
                            padding: EdgeInsets.symmetric(vertical: 20),
                            child: Column(
                              children: [
                                SpinKitDualRing(color: Colors.lightBlueAccent),
                                SizedBox(height: 8),
                                Text(
                                  'Processing video...',
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            GestureDetector(
                              onTap: _pickVideo,
                              onDoubleTap: () {
                                setState(() {
                                  oversampledCrop = "10_crop";
                                });
                              },
                              onLongPress: () {
                                setState(() {
                                  oversampledCrop = "center_crop";
                                });
                              },
                              child: ElevatedButton.icon(
                                onPressed: _pickVideo,
                                icon: Icon(
                                  Icons.video_library,
                                  color: Colors.black,
                                ),
                                label: Text(
                                  'Pick Video',
                                  style: TextStyle(
                                    color: Colors.black,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Color(0xFF6366F1),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(30),
                                  ),
                                  padding: EdgeInsets.symmetric(
                                      vertical: 12, horizontal: 20),
                                  elevation: 8,
                                ),
                              ),
                            ),
                            ElevatedButton.icon(
                              onPressed: _uploadVideo,
                              icon:
                                  Icon(Icons.cloud_upload, color: Colors.black),
                              label: Text(
                                'Upload Video',
                                style: TextStyle(
                                  color: Colors.black,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Color(0xFF4F46E5),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(30),
                                ),
                                padding: EdgeInsets.symmetric(
                                    vertical: 12, horizontal: 20),
                                elevation: 8,
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 30),
                        if (anomalyDetected != null)
                          Container(
                            padding: EdgeInsets.all(12),
                            margin: EdgeInsets.symmetric(horizontal: 40),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(10),
                              color: anomalyDetected!
                                  ? const Color(0xFFEF4444).withValues(alpha: 0.2)
                                  : const Color(0xFF10B981).withValues(alpha: 0.2),
                              border: Border.all(
                                color: anomalyDetected!
                                    ? const Color(0xFFEF4444).withValues(alpha: 0.5)
                                    : const Color(0xFF10B981).withValues(alpha: 0.5),
                                width: 1,
                              ),
                            ),
                            child: AnimatedSwitcher(
                              duration: Duration(seconds: 1),
                              child: anomalyDetected!
                                  ? Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.warning_amber_rounded,
                                            color: Color(0xFFEF4444)),
                                        SizedBox(width: 8),
                                        Text(
                                          'Crime Detected!',
                                          style: TextStyle(
                                            color: Color(0xFFEF4444),
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    )
                                  : Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.check_circle,
                                            color: Color(0xFF10B981)),
                                        SizedBox(width: 8),
                                        Text(
                                          'No Crime Detected',
                                          style: TextStyle(
                                            color: Color(0xFF10B981),
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

void main() =>
    runApp(MaterialApp(home: VideoUploadPage('Location', 'Coordinates')));
