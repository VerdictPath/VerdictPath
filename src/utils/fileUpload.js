import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export const pickDocumentForWeb = () => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf,.doc,.docx';
    input.multiple = false;
    
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
        resolve({ canceled: false, assets: [fileObject] });
      } else {
        resolve({ canceled: true });
      }
    };
    
    input.oncancel = () => {
      resolve({ canceled: true });
    };
    
    input.click();
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

export const pickImageForWeb = () => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
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
        resolve({ canceled: false, assets: [fileObject] });
      } else {
        resolve({ canceled: true });
      }
    };
    
    input.oncancel = () => {
      resolve({ canceled: true });
    };
    
    input.click();
  });
};

export const pickImage = async (options = {}) => {
  if (Platform.OS === 'web') {
    return await pickImageForWeb();
  } else {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      throw new Error('Camera permission is required');
    }

    return await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
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
