/**
 * Standard interface for Pulumi provisioning wrapper classes.
 *
 * @export
 * @interface IProvisioner
 */
export interface IProvisioner {
  /**
   * Provisions the resource.
   * @param name The friendly name of the resource. Should be under 10 characters in length and only use alphanumeric.
   */
  provision(name: string): void;
}
