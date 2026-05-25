import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'package:urban_guard/pages/video_upload_page.dart';

class RegisterCameraPage extends StatefulWidget {
  const RegisterCameraPage({super.key});

  @override
  RegisterCameraPageState createState() => RegisterCameraPageState();
}

class RegisterCameraPageState extends State<RegisterCameraPage> {
  String? _selectedLocality;
  final Map<String, List<double>> localityCoordinates = {
    'Anna Salai': [13.0827, 80.2716],
    'Mylapore': [13.0333, 80.2674],
    'T. Nagar': [13.0416, 80.2337],
    'Velachery': [12.9792, 80.2183],
    'Adyar': [13.0067, 80.2577],
    'Egmore': [13.0787, 80.2603],
    'Perungudi': [12.9682, 80.2489],
    'Royapettah': [13.0555, 80.2646],
    'Guindy': [13.0075, 80.2205],
    'Kodambakkam': [13.0525, 80.2304],
  };

  String? _coordinates;

  void _goToNextPage() {
    if (_selectedLocality != null) {
      final coordinates = localityCoordinates[_selectedLocality];
      _coordinates = '${coordinates![0]}, ${coordinates[1]}';

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => VideoUploadPage(
            _selectedLocality!,
            _coordinates!,
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please select a locality first!')),
      );
    }
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
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                AppBar(
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                  centerTitle: true,
                  title: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.camera, color: Color(0xFF6366F1), size: 24),
                      SizedBox(width: 8),
                      Text(
                        'CCTV Simulation',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(height: 20),
                        Lottie.asset(
                          'assets/lottie/GlobalGPS.json',
                          height: 200,
                          repeat: true,
                          animate: true,
                        ),
                        SizedBox(height: 20),
                        Card(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(15),
                          ),
                          elevation: 8,
                          margin: EdgeInsets.symmetric(horizontal: 10),
                          color: Color(0xFF1E293B),
                          child: Container(
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
                                    'Camera Registration',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF6366F1),
                                    ),
                                  ),
                                  SizedBox(height: 10),
                                  Text(
                                    'Please select the locality of your CCTV:',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.white70,
                                    ),
                                  ),
                                  SizedBox(height: 20),
                                  Container(
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(
                                          color: const Color(0xFF6366F1)
                                              .withValues(alpha: 0.5)),
                                      color: Color(0xFF0F172A),
                                    ),
                                    child: DropdownButtonFormField<String>(
                                      initialValue: _selectedLocality,
                                      hint: Text(
                                        'Select a Locality',
                                        style: TextStyle(
                                          color: Colors.white70,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      icon: Icon(Icons.arrow_drop_down,
                                          color: Color(0xFF6366F1)),
                                      dropdownColor: Color(0xFF1E293B),
                                      decoration: InputDecoration(
                                        contentPadding: EdgeInsets.symmetric(
                                            horizontal: 16, vertical: 8),
                                        border: InputBorder.none,
                                      ),
                                      onChanged: (String? newValue) {
                                        setState(() {
                                          _selectedLocality = newValue;
                                        });
                                      },
                                      items: localityCoordinates.keys
                                          .map<DropdownMenuItem<String>>(
                                              (String value) {
                                        return DropdownMenuItem<String>(
                                          value: value,
                                          child: Text(value,
                                              style: TextStyle(
                                                  color: Colors.white)),
                                        );
                                      }).toList(),
                                    ),
                                  ),
                                  SizedBox(height: 20),
                                  if (_selectedLocality != null)
                                    Container(
                                      padding: EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(10),
                                        color:
                                            const Color(0xFF6366F1).withValues(alpha: 0.1),
                                        border: Border.all(
                                            color: const Color(0xFF6366F1)
                                                .withValues(alpha: 0.3)),
                                      ),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Selected Locality: $_selectedLocality',
                                            style: TextStyle(
                                              fontSize: 16,
                                              color: Colors.white,
                                            ),
                                          ),
                                          SizedBox(height: 5),
                                          Text(
                                            'Coordinates: ${localityCoordinates[_selectedLocality]?.join(", ")}',
                                            style: TextStyle(
                                              fontSize: 14,
                                              color: Colors.white70,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        SizedBox(height: 30),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Color(0xFF6366F1),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                            padding: EdgeInsets.symmetric(
                                vertical: 12, horizontal: 40),
                            elevation: 8,
                          ),
                          onPressed: _goToNextPage,
                          child: Text(
                            'Next',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
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
    );
  }
}

void main() => runApp(MaterialApp(home: RegisterCameraPage()));
