"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/tailgrids/core/avatar";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { Input } from "@/components/tailgrids/core/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/tailgrids/core/input-group";
import { Label } from "@/components/tailgrids/core/label";
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";
import { TextArea } from "@/components/tailgrids/core/text-area";
import { TextField } from "@/components/tailgrids/core/text-field";
import Image from "next/image";
import { FieldError, Form } from "react-aria-components";
import { LogoutIcon, TrashIcon } from "./icons";

const countryOptions = [
  { value: "us", label: "Estados Unidos", flag: "/images/flag/US.svg" },
  { value: "ca", label: "Canadá", flag: "/images/flag/CA.svg" },
  { value: "fr", label: "Francia", flag: "/images/flag/FR.svg" },
  { value: "au", label: "Australia", flag: "/images/flag/AU.svg" },
  { value: "it", label: "Italia", flag: "/images/flag/IT.svg" },
  { value: "in", label: "India", flag: "/images/flag/IN.svg" },
];

export default function AccountPage() {
  return (
    <div className="space-y-6">
      {/* Account Details Card */}
      <Card className="bg-transparent p-5">
        <h2 className="mb-6 text-xl leading-7 font-semibold text-text-primary">Detalles de la cuenta</h2>

        <Form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <div className="flex items-center gap-4">
            <Avatar size="xxl">
              <AvatarImage src="/images/user/jhon-smith.png" alt="Jhon Smith" />
              <AvatarFallback>JS</AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <Button appearance="outline" size="sm">
                  Cambiar avatar
                </Button>
                <Button appearance="outline" variant="danger" size="sm">
                  Eliminar
                </Button>
              </div>
              <p className="text-xs leading-4 text-text-tertiary">
                Acepta PNG, JPEG, GIF; tamaño máximo 2 MB.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField className="w-full gap-2.5">
              <Label>Nombre completo</Label>
              <Input name="fullName" placeholder="Jhon Smith" className="w-full" required />
              <FieldError />
            </TextField>

            <TextField className="w-full gap-2.5">
              <Label>Correo electrónico</Label>
              <Input
                name="email"
                type="email"
                placeholder="jhon@example.com"
                className="w-full"
                required
              />
              <FieldError />
            </TextField>

            <TextField className="w-full gap-2.5">
              <Label>Número de teléfono</Label>
              <Input name="phone" placeholder="+1 604 555 1234" className="w-full" />
            </TextField>

            <TextField className="w-full gap-2.5">
              <Label>Sitio web</Label>
              <InputGroup>
                <InputGroupAddon className="after h-full border-r border-card-border text-input-placeholder-text-color">
                  https://
                </InputGroupAddon>
                <InputGroupInput name="website" placeholder="www.nextadmin.co" className="pl-2" />
              </InputGroup>
            </TextField>

            <TextField className="w-full gap-2.5">
              <Label>Dirección</Label>
              <Input
                name="address"
                placeholder="1901 Thornridge Cir. Shiloh, Hawaii 81063"
                className="w-full"
              />
            </TextField>

            <div>
              <Select name="country" defaultSelectedKey="us" className="h-full">
                <SelectLabel>País</SelectLabel>
                <SelectTrigger className="h-full w-full border-input-border">
                  <SelectValue className="flex items-center gap-2" />
                  <SelectIndicator />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((option) => (
                    <SelectItem key={option.value} id={option.value} textValue={option.label}>
                      <span className="flex items-center gap-2">
                        <Image
                          src={option.flag}
                          alt={option.label}
                          width={20}
                          height={20}
                          className="size-5 rounded-full object-cover"
                        />
                        <span>{option.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TextField className="col-span-1 w-full gap-2.5 md:col-span-2">
              <Label>Biografía</Label>
              <TextArea
                name="bio"
                className="h-25 shadow-xs"
                placeholder="Apasionado por crear aplicaciones web escalables y explorar tecnologías nuevas. Siempre dispuesto a resolver problemas complejos e innovar."
              />
            </TextField>

            <div className="col-span-1 flex items-center justify-end gap-3 md:col-span-2">
              <Button
                appearance="outline"
                variant="primary"
                size="lg"
                type="button"
                className="px-3.5 text-sm"
              >
                Cancelar
              </Button>
              <Button variant="primary" size="lg" type="submit" className="px-3.5 text-sm">
                Guardar cambios
              </Button>
            </div>
          </div>
        </Form>
      </Card>

      <Card className="bg-transparent p-5">
        {/* Sign Out */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-sm leading-5 font-medium text-text-primary">
              Cerrar sesión en todos los dispositivos
            </p>
            <p className="text-xs leading-4 text-text-tertiary">
              Termina todas las sesiones activas en tus dispositivos.
            </p>
          </div>

          <Button
            appearance="outline"
            variant="primary"
            size="lg"
            className="gap-2 px-3.5 py-2 text-sm [&>svg]:size-5"
          >
            <LogoutIcon />
            Cerrar sesión
          </Button>
        </div>
        <hr className="my-4 border-border-secondary-alt" />
        {/* Delete Account */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-sm leading-5 font-medium text-text-primary">Eliminar cuenta</p>
            <p className="text-xs leading-4 text-text-tertiary">
              Elimina tu cuenta de forma permanente junto con todos los datos asociados.
            </p>
          </div>

          <Button
            appearance="outline"
            variant="danger"
            size="lg"
            className="gap-2 px-3.5 text-sm [&>svg]:size-5"
          >
            <TrashIcon />
            Eliminar cuenta
          </Button>
        </div>
      </Card>
    </div>
  );
}
