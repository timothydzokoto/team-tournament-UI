import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabel,
  FormControlLabelText,
  Input,
  InputField,
} from '@gluestack-ui/themed';
import { type TextInputProps } from 'react-native';

type AppInputProps = TextInputProps & {
  label: string;
  helperText?: string;
  errorText?: string | null;
  multiline?: boolean;
};

export function AppInput({ label, helperText, errorText, multiline, ...props }: AppInputProps) {
  return (
    <FormControl isInvalid={Boolean(errorText)}>
      <FormControlLabel>
        <FormControlLabelText
          textTransform="uppercase"
          letterSpacing="$lg"
          fontSize="$xs"
          color="$textLight300">
          {label}
        </FormControlLabelText>
      </FormControlLabel>

      <Input
        mt="$2"
        borderRadius="$2xl"
        borderColor={errorText ? '$rose400' : '$borderDark800'}
        bg="$backgroundDark950"
        minHeight={multiline ? 112 : 56}>
        <InputField
          px="$4"
          py="$4"
          color="$textLight50"
          placeholderTextColor="#a8a29e"
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
        />
      </Input>

      {errorText ? (
        <FormControlError mt="$2">
          <FormControlErrorText>{errorText}</FormControlErrorText>
        </FormControlError>
      ) : null}

      {!errorText && helperText ? (
        <FormControlHelper mt="$2">
          <FormControlHelperText color="$textLight400">{helperText}</FormControlHelperText>
        </FormControlHelper>
      ) : null}
    </FormControl>
  );
}
