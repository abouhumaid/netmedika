import { useState } from 'react';
import { Text } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm } from "react-hook-form";
import CustomInput from '../components/CustomInput';
import AuthLayout from '../components/AuthLayout';
import { styles as authStyles } from '../styles/authStyles';
import CustomAlert from '../components/CustomAlert';
import { PharmacyColors } from '../constants/Colors';

type FormData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [alertMessage, setAlertMessage] = useState('');

  const { control, handleSubmit, formState: { errors }, getValues } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (formData: FormData) => {
    setLoading(true);
    const { username, email, password } = formData;
    try {
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('http://3.216.23.204:8000/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          username: username
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (response.ok) {
        setAlertType('success');
        setAlertMessage('Registration successful!');
        setAlertVisible(true);
      } else {
        setAlertType('error');
        setAlertMessage(data.detail || 'Registration failed.');
        setAlertVisible(true);
      }
    } catch (error) {
      setAlertType('error');
      setAlertMessage('An error occurred. Please try again.');
      setAlertVisible(true);
      console.error('Registration error:', error);
    } 
    finally {
      setLoading(false);
    }
  };


  return (
    <>
      <AuthLayout
        title="Create Account"
        subtitle="Join us to get started"
        submitText="Sign Up"
        onSubmit={handleSubmit(onSubmit)}
        loading={loading}
        footerText="Already have an account? "
        footerLinkText="Sign In"
        footerLinkHref="/login"
      >
        <CustomInput
          name="username"
          control={control}
          label="Username"
          validationType="username"
          left={<TextInput.Icon icon="account" color={PharmacyColors.accent} />}
        />

        <CustomInput
          name="email"
          control={control}
          label="Email"
          validationType="email"
          keyboardType="email-address"
          left={<TextInput.Icon icon="email" color={PharmacyColors.accent} />}
        />

        <CustomInput
          name="password"
          control={control}
          label="Password"
          validationType="password"
          secureTextEntry={!showPassword}
          right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} color={PharmacyColors.gray} />}
          left={<TextInput.Icon icon="lock" color={PharmacyColors.accent} />}
        />

        <CustomInput
          name="confirmPassword"
          control={control}
          label="Confirm Password"
          validationType="password"
          secureTextEntry={!showConfirmPassword}
          right={<TextInput.Icon icon={showConfirmPassword ? 'eye-off' : 'eye'} onPress={() => setShowConfirmPassword(!showConfirmPassword)} color={PharmacyColors.gray} />}
          left={<TextInput.Icon icon="lock-check" color={PharmacyColors.accent} />}
          validate={(val) => val === getValues('password') || 'Passwords must match'}
        />

        <Text style={authStyles.termsText}>
          By signing up, you agree to our{' '}
          <Text style={authStyles.termsLink}>Terms & Conditions</Text>
          {' '}and{' '}
          <Text style={authStyles.termsLink}>Privacy Policy</Text>
        </Text>
      </AuthLayout>
      <CustomAlert
        visible={alertVisible}
        title={alertType === 'success' ? 'Success' : 'Error'}
        type={alertType}
        message={alertMessage}
        confirmText="OK"
        onConfirm={() => {
          setAlertVisible(false);
          if (alertType === 'success') {
            setTimeout(() => {
              router.replace('/login');
            }, 200);
          }
        }}
      />
    </>
  );
}

