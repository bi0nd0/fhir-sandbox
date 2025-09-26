import { type AppointmentServiceCategory } from '../../types/fhir'
import { readResourceFile } from './data-loader'

export const appointmentFileName = (category: AppointmentServiceCategory): string =>
  `appointment.${category}.json`

export const loadAppointmentsForCategory = async <T>(
  patientId: string,
  category: AppointmentServiceCategory,
): Promise<T> => readResourceFile<T>(patientId, appointmentFileName(category))
