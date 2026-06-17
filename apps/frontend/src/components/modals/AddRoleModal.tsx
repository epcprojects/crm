'use client';

import { useEffect, useMemo } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import AppModal, { ModalPosition } from './AppModal';
import ThemeInput from '../ui/ThemeInput';
import { useAppLoader } from '../../app/providers/AppLoaderProvider';
import { CheckedBoxIcon, UncheckedBoxIcon } from '../../../public/icons';

export type AddRoleFormValues = {
  name: string;
  description: string;
  permissions: string[];
};

export type PermissionCatalogItem = {
  module: string;
  label: string;
  permissions: string[];
};

type AddRoleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (values: AddRoleFormValues) => Promise<void> | void;
  mode?: 'create' | 'edit';
  initialValues?: AddRoleFormValues;
  permissionCatalog?: PermissionCatalogItem[];
  permissionCatalogLoading?: boolean;
};

export default function AddRoleModal({
  isOpen,
  onClose,
  onConfirm,
  mode = 'create',
  initialValues,
  permissionCatalog = [],
  permissionCatalogLoading = false,
}: AddRoleModalProps) {
  const { setLoading } = useAppLoader();
  const showPermissions = true;
  const normalizedInitialValues = useMemo(
    () =>
      initialValues
        ? {
            ...initialValues,
            permissions: initialValues.permissions.map(normalizePermission),
          }
        : undefined,
    [initialValues],
  );

  const formik = useFormik<AddRoleFormValues>({
    initialValues: normalizedInitialValues ?? {
      name: '',
      description: '',
      permissions: [],
    },
    enableReinitialize: true,
    validationSchema: yup.object({
      name: yup.string().required('Role name is required'),
      description: yup.string().required('Description is required'),
      permissions: yup
        .array()
        .of(yup.string().required())
        .when([], {
          is: () => showPermissions,
          then: (schema) => schema.min(1, 'Select at least one permission'),
          otherwise: (schema) => schema.optional(),
        }),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        setLoading(true);
        await onConfirm?.(values);
        resetForm();
        onClose();
      } finally {
        setLoading(false);
      }
    },
  });

  const { resetForm } = formik;

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Role' : 'Add Role'}
      showFooter
      confirmLabel={
        formik.isSubmitting
          ? mode === 'edit'
            ? 'Saving...'
            : 'Creating...'
          : mode === 'edit'
            ? 'Save Changes'
            : 'Create Role'
      }
      cancelLabel="Cancel"
      onCancel={onClose}
      onConfirm={() => formik.submitForm()}
      confimBtnDisable={
        formik.isSubmitting || (showPermissions && permissionCatalogLoading)
      }
      scrollNeeded
      roundedCustom
      outSideClickClose={false}
      position={ModalPosition.RIGHT}
      size="extraLarge"
    >
      <div className="space-y-4 p-4 md:p-5">
        <ThemeInput
          label="Role Name"
          name="name"
          value={formik.values.name}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          errorText={formik.touched.name ? formik.errors.name : ''}
          placeholder="Enter role name"
          required
        />

        <div>
          <label className="mb-1.5 block text-sm font-normal text-gray-800 md:text-base">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formik.values.description}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Enter role description"
            rows={4}
            className={`w-full rounded-lg border bg-transparent px-3.5 py-2 text-sm font-medium text-gray-700 outline-none placeholder:text-gray-300 focus:border-gray-400 md:text-base ${
              formik.touched.description && formik.errors.description
                ? 'border-red-300 focus:border-red-400'
                : 'border-gray-200'
            }`}
          />
          {formik.touched.description && formik.errors.description ? (
            <p className="mt-1 text-xs text-red-600">
              {formik.errors.description}
            </p>
          ) : null}
        </div>

        {showPermissions ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-normal text-gray-800 md:text-base">
                Permissions <span className="text-red-500">*</span>
              </p>
              {/* <p className="mt-1 text-xs text-gray-500">
                Select the catalog permissions that this role should have.
              </p> */}
            </div>

            {permissionCatalogLoading ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                Loading permission catalog...
              </div>
            ) : permissionCatalog.length ? (
              <div className="space-y-3">
                {permissionCatalog.map((catalogItem) => {
                  const selectedCount = catalogItem.permissions.filter(
                    (permission) =>
                      hasPermission(formik.values.permissions, permission),
                  ).length;
                  const allSelected =
                    catalogItem.permissions.length > 0 &&
                    selectedCount === catalogItem.permissions.length;
                  const someSelected = selectedCount > 0;

                  return (
                    <div
                      key={catalogItem.module}
                      className="overflow-hidden rounded-lg border border-gray-200"
                    >
                      <label className="flex cursor-pointer border-b border-b-gray-200 items-center gap-2 bg-gray-50 px-3.5 py-2">
                        <div>
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(input) => {
                              if (input) {
                                input.indeterminate =
                                  someSelected && !allSelected;
                              }
                            }}
                            onChange={() =>
                              toggleModulePermissions(
                                catalogItem,
                                formik.values.permissions,
                                (permissions) =>
                                  formik.setFieldValue(
                                    'permissions',
                                    permissions,
                                  ),
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300 accent-[#7F56D9] hidden"
                          />
                          {allSelected ? (
                            <CheckedBoxIcon width="18" height="18" />
                          ) : (
                            <UncheckedBoxIcon
                              bgFill="white"
                              width="18"
                              height="18"
                            />
                          )}
                        </div>
                        <span className="text-sm font-medium select-none text-black">
                          {catalogItem.label}
                        </span>
                      </label>

                      <div className="flex flex-wrap gap-x-4 gap-y-3 bg-white px-3.5 py-3">
                        {catalogItem.permissions.map((permission) => (
                          <label
                            key={permission}
                            className="flex cursor-pointer items-center gap-2 text-sm text-black"
                          >
                            <input
                              type="checkbox"
                              checked={hasPermission(
                                formik.values.permissions,
                                permission,
                              )}
                              onChange={() =>
                                togglePermission(
                                  permission,
                                  formik.values.permissions,
                                  (permissions) =>
                                    formik.setFieldValue(
                                      'permissions',
                                      permissions,
                                    ),
                                )
                              }
                              className="h-4 w-4 rounded border-gray-300 accent-[#7F56D9] hidden"
                            />
                            {hasPermission(
                              formik.values.permissions,
                              permission,
                            ) ? (
                              <CheckedBoxIcon width="18" height="18" />
                            ) : (
                              <UncheckedBoxIcon
                                bgFill="white"
                                width="18"
                                height="18"
                              />
                            )}
                            <span className="select-none">
                              {formatPermissionLabel(permission)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-600">
                Permission catalog is unavailable right now.
              </div>
            )}

            {formik.touched.permissions && formik.errors.permissions ? (
              <p className="text-xs text-red-600">
                {String(formik.errors.permissions)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}

function toggleModulePermissions(
  catalogItem: PermissionCatalogItem,
  selectedPermissions: string[],
  onChange: (permissions: string[]) => void,
) {
  const normalizedSelectedPermissions =
    selectedPermissions.map(normalizePermission);
  const modulePermissions = new Set(
    catalogItem.permissions.map(normalizePermission),
  );
  const hasUnselectedPermission = catalogItem.permissions.some(
    (permission) => !hasPermission(selectedPermissions, permission),
  );

  if (hasUnselectedPermission) {
    onChange(
      Array.from(
        new Set([
          ...normalizedSelectedPermissions,
          ...catalogItem.permissions.map(normalizePermission),
        ]),
      ),
    );
    return;
  }

  onChange(
    normalizedSelectedPermissions.filter(
      (permission) => !modulePermissions.has(permission),
    ),
  );
}

function togglePermission(
  permission: string,
  selectedPermissions: string[],
  onChange: (permissions: string[]) => void,
) {
  const normalizedPermission = normalizePermission(permission);
  const normalizedSelectedPermissions =
    selectedPermissions.map(normalizePermission);

  if (normalizedSelectedPermissions.includes(normalizedPermission)) {
    onChange(
      normalizedSelectedPermissions.filter(
        (item) => item !== normalizedPermission,
      ),
    );
    return;
  }

  onChange([...normalizedSelectedPermissions, normalizedPermission]);
}

function formatPermissionLabel(permission: string) {
  const permissionName = permission.split('.').pop() ?? permission;

  return permissionName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizePermission(permission: string) {
  return permission.replace(/:/g, '.').trim();
}

function hasPermission(selectedPermissions: string[], permission: string) {
  const normalizedPermission = normalizePermission(permission);

  return selectedPermissions
    .map(normalizePermission)
    .includes(normalizedPermission);
}
