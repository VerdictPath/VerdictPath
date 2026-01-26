import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export const pickDocumentForWeb = () => {
  return new Promise((resolve, reject) => {
    try {
      if (typeof document === 'undefined') {
        reject(new Error('document is not available'));
        return;
      }
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf,.doc,.docx';
      input.multiple = false;
      input.style.display = 'none';
      
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const fileObject = {
            uri: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            mimeType: file.type,
            file: file
          };
          document.body.removeChild(input);
          resolve({ canceled: false, assets: [fileObject] });
        } else {
          document.body.removeChild(input);
          resolve({ canceled: true });
        }
      };
      
      input.oncancel = () => {
        document.body.removeChild(input);
        resolve({ canceled: true });
      };
      
      document.body.appendChild(input);
      input.click();
    } catch (error) {
      reject(error);
    }
  });
};

export const pickDocument = async (options = {}) => {
  if (Platform.OS === 'web') {
    return await pickDocumentForWeb();
  } else {
    return await DocumentPicker.getDocumentAsync({
      type: options.type || ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      ...options
    });
  }
};

export const pickImageForWeb = (useCamera = false) => {
  return new Promise((resolve, reject) => {
    try {
      if (typeof document === 'undefined') {
        reject(new Error('document is not available'));
        return;
      }
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      // On mobile web browsers, capture="environment" opens the camera directly
      if (useCamera) {
        input.capture = 'environment';
      }
      
      input.style.display = 'none';
      
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const fileObject = {
            uri: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            mimeType: file.type,
            file: file
          };
          document.body.removeChild(input);
          resolve({ canceled: false, assets: [fileObject] });
        } else {
          document.body.removeChild(input);
          resolve({ canceled: true });
        }
      };
      
      input.oncancel = () => {
        document.body.removeChild(input);
        resolve({ canceled: true });
      };
      
      document.body.appendChild(input);
      input.click();
    } catch (error) {
      reject(error);
    }
  });
};

export const pickImage = async (options = {}) => {
  if (Platform.OS === 'web') {
    // On mobile web browsers, capture="environment" will open the camera
    // On desktop browsers, it will open file picker
    return await pickImageForWeb(true);
  } else {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    
    if (permissionResult.granted === false) {
      throw new Error('Camera permission is required to take photos. Please enable camera access in your device settings.');
    }

    return await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      ...options
    });
  }
};

export const pickImageFromLibrary = async (options = {}) => {
  if (Platform.OS === 'web') {
    // On web browsers, this opens the regular file picker (no capture attribute)
    return await pickImageForWeb(false);
  } else {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    
    if (permissionResult.granted === false) {
      throw new Error('Photo library permission is required to select photos. Please enable photo access in your device settings.');
    }

    return await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 0.8,
      ...options
    });
  }
};

export const createFormDataFromFile = (fileAsset, fieldName = 'file', additionalData = {}) => {
  const formData = new FormData();
  
  if (Platform.OS === 'web' && fileAsset.file) {
    formData.append(fieldName, fileAsset.file);
  } else {
    const file = {
      uri: fileAsset.uri,
      type: fileAsset.mimeType || 'application/octet-stream',
      name: fileAsset.name || `upload_${Date.now()}.${fileAsset.mimeType?.split('/')[1] || 'jpg'}`
    };
    formData.append(fieldName, file);
  }
  
  Object.keys(additionalData).forEach(key => {
    formData.append(key, additionalData[key]);
  });
  
  return formData;
};
