# Student Authentication Verification

The student application now uses separate **Register** and **Login** routes. Registration stores a salted password hash and student profile locally on the device. Login validates the stored credentials, protected application routes redirect unauthenticated users to the correct authentication screen, and sign-out returns the user to Login.

Automated Flutter widget coverage exercised the full local flow: Register screen visibility, account registration, home redirection, profile sign-out, Login screen visibility, and successful login with the registered credentials. Static analysis and the full Flutter test suite completed successfully before the signed release APK was built and verified with Android APK Signature Scheme v2.

An Android Virtual Device was created for runtime verification, but it could not start because the sandbox does not expose `/dev/kvm`, which x86_64 emulation requires. The failure is environment-specific and does not affect installation on a physical Android device. The signed APK should be installed on a device for the final physical-device check.
