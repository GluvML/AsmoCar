import os
import re

def patch_ios():
    podfile_path = "ios/Podfile"
    if os.path.exists(podfile_path):
        print(f"Patching {podfile_path}...")
        with open(podfile_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Set platform to iOS 13.0
        content = re.sub(r"#\s*platform :ios,.*", "platform :ios, '13.0'", content)
        if "platform :ios" not in content:
            content = "platform :ios, '13.0'\n" + content

        # Inject build settings in post_install
        search_target = "flutter_additional_ios_build_settings(target)"
        replacement = """flutter_additional_ios_build_settings(target)
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
      config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
      config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
    end"""
        if search_target in content and "IPHONEOS_DEPLOYMENT_TARGET" not in content:
            content = content.replace(search_target, replacement)

        with open(podfile_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Podfile patched successfully.")

    pbxproj_path = "ios/Runner.xcodeproj/project.pbxproj"
    if os.path.exists(pbxproj_path):
        print(f"Patching {pbxproj_path}...")
        with open(pbxproj_path, "r", encoding="utf-8") as f:
            p_content = f.read()

        p_content = p_content.replace('CODE_SIGN_IDENTITY = "iPhone Developer";', 'CODE_SIGN_IDENTITY = "";')
        p_content = p_content.replace('CODE_SIGNING_REQUIRED = YES;', 'CODE_SIGNING_REQUIRED = NO;')
        p_content = p_content.replace('CODE_SIGNING_ALLOWED = YES;', 'CODE_SIGNING_ALLOWED = NO;')

        with open(pbxproj_path, "w", encoding="utf-8") as f:
            f.write(p_content)
        print("project.pbxproj patched successfully.")

if __name__ == "__main__":
    patch_ios()
