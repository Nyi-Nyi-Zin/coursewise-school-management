# Student App Delivery Workflow

For every future Flutter student-app change, the delivery sequence is:

1. Run `flutter analyze` and `flutter test` from `student-app/`.
2. Build `flutter build apk --release` using the protected Android release signing configuration.
3. Verify the generated artifact with `apksigner verify --verbose` and copy it to the delivery location.
4. Create a project checkpoint, then push the corresponding source update to the private GitHub repository: `Nyi-Nyi-Zin/coursewise-school-management`.

The release-keystore credentials are intentionally excluded from Git. Keep a secure backup of the keystore before distributing subsequent signed updates, because Android devices require the same signing key to install an update over an existing app.
