-- Digitoll: extra fields for Transport / Master Consignment / House Consignment
-- Run this in the Supabase SQL editor. Safe to re-run (idempotent).

-- Transport notification: active border transport means, operator/driver, customs office / arrival
alter table transports add column if not exists scheduled_arrival           timestamptz;
alter table transports add column if not exists identification_number        text;
alter table transports add column if not exists type_of_identification       text;
alter table transports add column if not exists conveyance_reference_number  text;
alter table transports add column if not exists operator_name                text;
alter table transports add column if not exists operator_id                  text;
alter table transports add column if not exists customs_office               text;

-- Master consignment: waybill no. + type, carrier id, transport equipment, locations, documents
alter table masters add column if not exists document_number     text;
alter table masters add column if not exists document_type       text;
alter table masters add column if not exists carrier_id          text;
alter table masters add column if not exists transport_equipment text;
alter table masters add column if not exists loading_location    text;
alter table masters add column if not exists unloading_location  text;
alter table masters add column if not exists relevant_documents  text;

-- House consignment: tracking no., customs procedure, declaration/NCTS refs, equipment, locations, documents
alter table houses add column if not exists tracking_number        text;
alter table houses add column if not exists customs_procedure      text;
alter table houses add column if not exists import_declaration_ref text;
alter table houses add column if not exists export_declaration_ref text;
alter table houses add column if not exists ncts_reference         text;
alter table houses add column if not exists transport_equipment    text;
alter table houses add column if not exists loading_location       text;
alter table houses add column if not exists unloading_location     text;
alter table houses add column if not exists relevant_documents     text;
