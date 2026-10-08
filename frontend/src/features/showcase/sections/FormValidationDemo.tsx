import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { CheckboxField } from '@/components/forms/CheckboxField';
import { FormErrorAlert } from '@/components/forms/FormErrorAlert';
import { SelectField } from '@/components/forms/SelectField';
import { TextField } from '@/components/forms/TextField';
import { AppButton } from '@/components/ui/AppButton';
import { SuccessState } from '@/components/ui/StateMessage';
import { ApiError } from '@/services/apiError';
import { applyApiValidationErrors } from '@/utils/formErrors';

import { ShowcaseSection } from '../ShowcaseSection';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
  email: z.email('Enter a valid email address.'),
  team: z.string().min(1, 'Choose a team.'),
  terms: z.boolean().refine((value) => value, 'You must accept the terms.'),
});

type Values = z.infer<typeof schema>;
const FIELDS = ['name', 'email', 'team', 'terms'] as const;

/** DEMO: simulates the 422 envelope FastAPI returns, to show server errors mapped onto fields. */
function fakeServerValidation(values: Values): Promise<void> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (values.email.endsWith('@example.com')) {
        reject(
          new ApiError({
            status: 422,
            code: 'validation_error',
            message: 'Some fields are invalid.',
            details: [
              {
                field: 'email',
                loc: ['body', 'email'],
                message: 'This email domain is not allowed (server-side check).',
                type: 'value_error',
              },
            ],
          }),
        );
      } else {
        resolve();
      }
    }, 800);
  });
}

export function FormValidationDemo() {
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', team: '', terms: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await fakeServerValidation(values);
      setSubmitted(true);
    } catch (error) {
      setFormError(applyApiValidationErrors(error, setError, FIELDS));
    }
  });

  return (
    <ShowcaseSection
      id="form-validation"
      title="Form validation"
      description={
        <>
          Client-side rules (zod) plus server errors mapped to fields. Submit an{' '}
          <code>@example.com</code> address to see a simulated FastAPI 422 response.
        </>
      }
    >
      {submitted ? (
        <SuccessState
          title="Form submitted"
          description="All client- and server-side checks passed (demo only, nothing was saved)."
          action={
            <AppButton
              variant="outline-primary"
              onClick={() => {
                reset();
                setSubmitted(false);
              }}
            >
              Start over
            </AppButton>
          }
        />
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <FormErrorAlert message={formError} />
          <Row className="g-3">
            <Col md={6}>
              <TextField label="Name" required error={errors.name?.message} {...register('name')} />
            </Col>
            <Col md={6}>
              <TextField
                label="Email"
                type="email"
                required
                error={errors.email?.message}
                {...register('email')}
              />
            </Col>
            <Col md={6}>
              <SelectField
                label="Team"
                required
                placeholder="Select a team"
                options={[
                  { value: 'engineering', label: 'Engineering' },
                  { value: 'design', label: 'Design' },
                  { value: 'operations', label: 'Operations' },
                ]}
                error={errors.team?.message}
                {...register('team')}
              />
            </Col>
            <Col md={6} className="d-flex align-items-center">
              <CheckboxField
                label="I accept the terms"
                error={errors.terms?.message}
                {...register('terms')}
              />
            </Col>
          </Row>
          <AppButton type="submit" isLoading={isSubmitting} loadingText="Validating…">
            Submit
          </AppButton>
        </form>
      )}
    </ShowcaseSection>
  );
}
