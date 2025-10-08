-- =====================================================================
--  FARMPRO SYSTEM RBAC MIGRATION (Prisma-style cuid IDs)
--  All IDs use Prisma cuid() format: c<random 24-char string>
-- =====================================================================

-- 1️⃣ Create System Organization
INSERT INTO "organizations" (
"id", "name", "type", "email", "phone", "address",
"description", "isVerified", "isActive", "plan",
"maxUsers", "maxFarms", "features", "allowedModules",
"allowCustomRoles", "currency", "createdAt", "updatedAt"
) VALUES (
'ckx4z2yqr0010n8h8t6p5f7jb', -- org id
'System',
'FARM_OPERATION',
'system@farmpro.app',
'+1-000-000-0000',
'{"street":"System","city":"System","state":"SY","zipCode":"00000","country":"USA"}',
'System organization for platform-wide roles and permissions',
true, true, 'ENTERPRISE',
999999, 999999,
ARRAY['all_features'],
ARRAY['farm_management','activities','inventory','analytics','marketplace','orders','trading','deliveries','observations','sensors','crop_cycles','areas','seasons','drivers','tracking','intelligence','media'],
true,
'USD',
NOW(), NOW()
);

-- 2️⃣ Create Permissions (each has cuid id)
INSERT INTO "permissions" ("id","resource","action","description","isSystemPermission","createdAt") VALUES
('ckx4z2yqr0020n8h8t6p5f7jc','user','create','Create new users',true,NOW()),
('ckx4z2yqr0030n8h8t6p5f7jd','user','read','View user information',true,NOW()),
('ckx4z2yqr0040n8h8t6p5f7je','user','update','Update user information',true,NOW()),
('ckx4z2yqr0050n8h8t6p5f7jf','user','delete','Delete users',true,NOW()),
('ckx4z2yqr0060n8h8t6p5f7jg','organization','create','Create organizations',true,NOW()),
('ckx4z2yqr0070n8h8t6p5f7jh','organization','read','View organization information',true,NOW()),
('ckx4z2yqr0080n8h8t6p5f7ji','organization','update','Update organization settings',true,NOW()),
('ckx4z2yqr0090n8h8t6p5f7jj','organization','delete','Delete organizations',true,NOW()),
('ckx4z2yqr00a0n8h8t6p5f7jk','farm','create','Create farms',true,NOW()),
('ckx4z2yqr00b0n8h8t6p5f7jl','farm','read','View farm information',true,NOW()),
('ckx4z2yqr00c0n8h8t6p5f7jm','farm','update','Update farm details',true,NOW()),
('ckx4z2yqr00d0n8h8t6p5f7jn','farm','delete','Delete farms',true,NOW()),
('ckx4z2yqr00e0n8h8t6p5f7jo','activity','create','Create farm activities',true,NOW()),
('ckx4z2yqr00f0n8h8t6p5f7jp','activity','read','View activities',true,NOW()),
('ckx4z2yqr00g0n8h8t6p5f7jq','activity','update','Update activities',true,NOW()),
('ckx4z2yqr00h0n8h8t6p5f7jr','activity','delete','Delete activities',true,NOW()),
('ckx4z2yqr00i0n8h8t6p5f7js','inventory','create','Create inventory items',true,NOW()),
('ckx4z2yqr00j0n8h8t6p5f7jt','inventory','read','View inventory',true,NOW()),
('ckx4z2yqr00k0n8h8t6p5f7ju','inventory','update','Update inventory',true,NOW()),
('ckx4z2yqr00l0n8h8t6p5f7jv','inventory','delete','Delete inventory items',true,NOW()),
('ckx4z2yqr00m0n8h8t6p5f7jw','order','create','Create orders',true,NOW()),
('ckx4z2yqr00n0n8h8t6p5f7jx','order','read','View orders',true,NOW()),
('ckx4z2yqr00o0n8h8t6p5f7jy','order','update','Update orders',true,NOW()),
('ckx4z2yqr00p0n8h8t6p5f7jz','order','delete','Delete orders',true,NOW()),
('ckx4z2yqr00q0n8h8t6p5f7ka','role','create','Create roles',true,NOW()),
('ckx4z2yqr00r0n8h8t6p5f7kb','role','read','View roles',true,NOW()),
('ckx4z2yqr00s0n8h8t6p5f7kc','role','update','Update roles',true,NOW()),
('ckx4z2yqr00t0n8h8t6p5f7kd','role','delete','Delete roles',true,NOW()),
('ckx4z2yqr00u0n8h8t6p5f7ke','permission','read','View permissions',true,NOW()),
('ckx4z2yqr00v0n8h8t6p5f7kf','permission','manage','Manage permissions',true,NOW()),
('ckx4z2yqr00w0n8h8t6p5f7kg','platform','admin','Platform administration',true,NOW()),
('ckx4z2yqr00x0n8h8t6p5f7kh','platform','monitor','Platform monitoring',true,NOW()),

-- Additional permissions for plan-based features
('ckx4z2yqr00y0n8h8t6p5f7ki','analytics','read','View analytics data',true,NOW()),
('ckx4z2yqr00z0n8h8t6p5f7kj','analytics','manage','Full analytics management',true,NOW()),
('ckx4z2yqr0100n8h8t6p5f7kk','intelligence','query','Query AI intelligence',true,NOW()),
('ckx4z2yqr0110n8h8t6p5f7kl','intelligence','analyze','Run farm analysis',true,NOW()),
('ckx4z2yqr0120n8h8t6p5f7km','intelligence','optimize','Run activity optimization',true,NOW()),
('ckx4z2yqr0130n8h8t6p5f7kn','intelligence','manage','Full intelligence management',true,NOW()),
('ckx4z2yqr0140n8h8t6p5f7ko','api','access','Access API endpoints',true,NOW()),
('ckx4z2yqr0150n8h8t6p5f7kp','api','manage','Manage API access',true,NOW()),
('ckx4z2yqr0160n8h8t6p5f7kq','commodity','read','View commodity information',true,NOW()),
('ckx4z2yqr0170n8h8t6p5f7kr','commodity','manage','Full commodity management',true,NOW()),
('ckx4z2yqr0180n8h8t6p5f7ks','marketplace','browse','Browse marketplace',true,NOW()),
('ckx4z2yqr0190n8h8t6p5f7kt','marketplace','create','Create marketplace listings',true,NOW()),
('ckx4z2yqr01a0n8h8t6p5f7ku','marketplace','read','View marketplace listings',true,NOW()),
('ckx4z2yqr01b0n8h8t6p5f7kv','marketplace','update','Update marketplace listings',true,NOW()),
('ckx4z2yqr01c0n8h8t6p5f7kw','marketplace','delete','Delete marketplace listings',true,NOW()),
('ckx4z2yqr01d0n8h8t6p5f7kx','marketplace','manage','Full marketplace management',true,NOW()),
('ckx4z2yqr01e0n8h8t6p5f7ky','transaction','create','Create transactions',true,NOW()),
('ckx4z2yqr01f0n8h8t6p5f7kz','transaction','read','View transactions',true,NOW()),
('ckx4z2yqr0200n8h8t6p5f7la','transaction','update','Update transactions',true,NOW()),
('ckx4z2yqr0210n8h8t6p5f7lb','transaction','manage','Full transaction management',true,NOW()),
('ckx4z2yqr0220n8h8t6p5f7lc','settings','read','View settings',true,NOW()),
('ckx4z2yqr0230n8h8t6p5f7ld','settings','update','Update settings',true,NOW()),
('ckx4z2yqr0240n8h8t6p5f7le','settings','manage','Full settings management',true,NOW()),
('ckx4z2yqr0250n8h8t6p5f7lf','media','create','Create/upload media files',true,NOW()),
('ckx4z2yqr0260n8h8t6p5f7lg','media','upload','Upload media files',true,NOW()),
('ckx4z2yqr0270n8h8t6p5f7lh','media','read','View media files',true,NOW()),
('ckx4z2yqr0280n8h8t6p5f7li','media','update','Update media files',true,NOW()),
('ckx4z2yqr0290n8h8t6p5f7lj','media','delete','Delete media files',true,NOW()),
('ckx4z2yqr02a0n8h8t6p5f7lk','media','manage','Full media management',true,NOW()),
('ckx4z2yqr02b0n8h8t6p5f7ll','role','assign','Assign roles to users',true,NOW()),
('ckx4z2yqr02c0n8h8t6p5f7lm','role','manage','Full role management',true,NOW()),
('ckx4z2yqr02d0n8h8t6p5f7ln','user','manage','Full user management',true,NOW()),
('ckx4z2yqr02e0n8h8t6p5f7lo','organization','manage','Full organization management',true,NOW()),
('ckx4z2yqr02f0n8h8t6p5f7lp','farm','manage','Full farm management',true,NOW()),
('ckx4z2yqr0300n8h8t6p5f7lq','activity','assign','Assign activities to users',true,NOW()),
('ckx4z2yqr0310n8h8t6p5f7lr','activity','manage','Full activity management',true,NOW()),
('ckx4z2yqr0320n8h8t6p5f7ls','inventory','manage','Full inventory management',true,NOW()),
('ckx4z2yqr0330n8h8t6p5f7lt','order','manage','Full order management',true,NOW());

-- 3️⃣ Create Roles
INSERT INTO "roles" ("id","name","description","organizationId","level","isActive","isSystemRole","isPlatformAdmin","scope","metadata","createdAt","updatedAt") VALUES
-- System Roles
('ckx4z2yqr0100n8h8t6p5f7ki','Platform Admin','Full platform administration access with complete control over all features and organizations','ckx4z2yqr0010n8h8t6p5f7jb',100,true,true,true,'PLATFORM','{"permissions":["all"],"restrictions":[]}',NOW(),NOW()),
('ckx4z2yqr0110n8h8t6p5f7kj','Platform Member','Platform-wide access with read-only permissions across all organizations','ckx4z2yqr0010n8h8t6p5f7jb',50,true,true,false,'PLATFORM','{"permissions":["read_only"],"restrictions":["admin_functions"]}',NOW(),NOW()),
('ckx4z2yqr0120n8h8t6p5f7kl','Organization Admin','Full administrative control within organization','ckx4z2yqr0010n8h8t6p5f7jb',90,true,true,false,'ORGANIZATION','{"permissions":["org_management"],"restrictions":["platform_admin"]}',NOW(),NOW()),

-- Plan-based role templates (system-scoped for copying to organizations)
('ckx4z2yqr0400n8h8t6p5f7ma','FREE Plan User','Default role template for FREE plan users',NULL,10,true,true,false,'ORGANIZATION','{"planTier":"FREE","isTemplate":true,"features":["basic_farm_management","marketplace_access","order_management","inventory_management"]}',NOW(),NOW()),
('ckx4z2yqr0410n8h8t6p5f7mb','BASIC Plan User','Default role template for BASIC plan users',NULL,20,true,true,false,'ORGANIZATION','{"planTier":"BASIC","isTemplate":true,"features":["basic_farm_management","marketplace_access","order_management","inventory_management","deliveries"]}',NOW(),NOW()),
('ckx4z2yqr0420n8h8t6p5f7mc','PRO Plan User','Default role template for PRO plan users',NULL,30,true,true,false,'ORGANIZATION','{"planTier":"PRO","isTemplate":true,"features":["basic_farm_management","marketplace_access","order_management","inventory_management","deliveries","analytics","ai_insights","api_access","custom_roles"]}',NOW(),NOW()),
('ckx4z2yqr0430n8h8t6p5f7md','ENTERPRISE Plan User','Default role template for ENTERPRISE plan users',NULL,40,true,true,false,'ORGANIZATION','{"planTier":"ENTERPRISE","isTemplate":true,"features":["all_features","white_label","priority_support","unlimited_usage"]}',NOW(),NOW()),

-- Team role templates (system-scoped for copying to organizations)
('ckx4z2yqr0500n8h8t6p5f7na','Farm Manager','Farm management role template',NULL,80,true,true,false,'ORGANIZATION','{"isTeamRoleTemplate":true,"category":"management","roleType":"farm_manager","permissions":["farm_management","activity_management","user_management"]}',NOW(),NOW()),
('ckx4z2yqr0510n8h8t6p5f7nb','Field Worker','Field worker role template',NULL,70,true,true,false,'ORGANIZATION','{"isTeamRoleTemplate":true,"category":"field","roleType":"field_worker","permissions":["activity_execution","data_entry","field_operations"]}',NOW(),NOW()),
('ckx4z2yqr0520n8h8t6p5f7nc','Data Entry','Data entry role template',NULL,60,true,true,false,'ORGANIZATION','{"isTeamRoleTemplate":true,"category":"data","roleType":"data_entry","permissions":["data_entry","inventory_management","reporting"]}',NOW(),NOW()),
('ckx4z2yqr0530n8h8t6p5f7nd','Viewer','Viewer role template',NULL,50,true,true,false,'ORGANIZATION','{"isTeamRoleTemplate":true,"category":"viewer","roleType":"viewer","permissions":["read_only","view_reports"]}',NOW(),NOW());

-- 4️⃣ Role-Permission Mappings
-- Platform Admin → all permissions (43 permissions)
INSERT INTO "role_permissions" ("id","roleId","permissionId","granted","createdAt") VALUES
-- User Management
('ckx4z2yqr1000n8h8t6p5f7kl','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0020n8h8t6p5f7jc',true,NOW()), -- user:create
('ckx4z2yqr1001n8h8t6p5f7km','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0030n8h8t6p5f7jd',true,NOW()), -- user:read
('ckx4z2yqr1002n8h8t6p5f7kn','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0040n8h8t6p5f7je',true,NOW()), -- user:update
('ckx4z2yqr1003n8h8t6p5f7ko','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0050n8h8t6p5f7jf',true,NOW()), -- user:delete
('ckx4z2yqr1004n8h8t6p5f7kp','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr02d0n8h8t6p5f7ln',true,NOW()), -- user:manage

-- Organization Management
('ckx4z2yqr1005n8h8t6p5f7kq','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0060n8h8t6p5f7jg',true,NOW()), -- organization:create
('ckx4z2yqr1006n8h8t6p5f7kr','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0070n8h8t6p5f7jh',true,NOW()), -- organization:read
('ckx4z2yqr1007n8h8t6p5f7ks','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0080n8h8t6p5f7ji',true,NOW()), -- organization:update
('ckx4z2yqr1008n8h8t6p5f7kt','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0090n8h8t6p5f7jj',true,NOW()), -- organization:delete
('ckx4z2yqr1009n8h8t6p5f7ku','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr02e0n8h8t6p5f7lo',true,NOW()), -- organization:manage

-- Farm Management
('ckx4z2yqr100an8h8t6p5f7kv','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00a0n8h8t6p5f7jk',true,NOW()), -- farm:create
('ckx4z2yqr100bn8h8t6p5f7kw','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00b0n8h8t6p5f7jl',true,NOW()), -- farm:read
('ckx4z2yqr100cn8h8t6p5f7kx','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00c0n8h8t6p5f7jm',true,NOW()), -- farm:update
('ckx4z2yqr100dn8h8t6p5f7ky','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00d0n8h8t6p5f7jn',true,NOW()), -- farm:delete
('ckx4z2yqr100en8h8t6p5f7kz','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr02f0n8h8t6p5f7lp',true,NOW()), -- farm:manage

-- Activity Management
('ckx4z2yqr100fn8h8t6p5f7la','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00e0n8h8t6p5f7jo',true,NOW()), -- activity:create
('ckx4z2yqr100gn8h8t6p5f7lb','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00f0n8h8t6p5f7jp',true,NOW()), -- activity:read
('ckx4z2yqr100hn8h8t6p5f7lc','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00g0n8h8t6p5f7jq',true,NOW()), -- activity:update
('ckx4z2yqr100in8h8t6p5f7ld','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00h0n8h8t6p5f7jr',true,NOW()), -- activity:delete
('ckx4z2yqr100jn8h8t6p5f7le','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0300n8h8t6p5f7lq',true,NOW()), -- activity:assign
('ckx4z2yqr100kn8h8t6p5f7lf','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0310n8h8t6p5f7lr',true,NOW()), -- activity:manage

-- Inventory Management
('ckx4z2yqr100ln8h8t6p5f7lg','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00i0n8h8t6p5f7js',true,NOW()), -- inventory:create
('ckx4z2yqr100mn8h8t6p5f7lh','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00j0n8h8t6p5f7jt',true,NOW()), -- inventory:read
('ckx4z2yqr100nn8h8t6p5f7li','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00k0n8h8t6p5f7ju',true,NOW()), -- inventory:update
('ckx4z2yqr100on8h8t6p5f7lj','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00l0n8h8t6p5f7jv',true,NOW()), -- inventory:delete
('ckx4z2yqr100pn8h8t6p5f7lk','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0320n8h8t6p5f7ls',true,NOW()), -- inventory:manage

-- Order Management
('ckx4z2yqr100qn8h8t6p5f7ll','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00m0n8h8t6p5f7jw',true,NOW()), -- order:create
('ckx4z2yqr100rn8h8t6p5f7lm','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00n0n8h8t6p5f7jx',true,NOW()), -- order:read
('ckx4z2yqr100sn8h8t6p5f7ln','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00o0n8h8t6p5f7jy',true,NOW()), -- order:update
('ckx4z2yqr100tn8h8t6p5f7lo','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00p0n8h8t6p5f7jz',true,NOW()), -- order:delete
('ckx4z2yqr100un8h8t6p5f7lp','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0330n8h8t6p5f7lt',true,NOW()), -- order:manage

-- Role & Permission Management
('ckx4z2yqr100vn8h8t6p5f7lq','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00q0n8h8t6p5f7ka',true,NOW()), -- role:create
('ckx4z2yqr100wn8h8t6p5f7lr','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00r0n8h8t6p5f7kb',true,NOW()), -- role:read
('ckx4z2yqr100xn8h8t6p5f7ls','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00s0n8h8t6p5f7kc',true,NOW()), -- role:update
('ckx4z2yqr100yn8h8t6p5f7lt','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00t0n8h8t6p5f7kd',true,NOW()), -- role:delete
('ckx4z2yqr100zn8h8t6p5f7lu','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr02b0n8h8t6p5f7ll',true,NOW()), -- role:assign
('ckx4z2yqr1010n8h8t6p5f7lv','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr02c0n8h8t6p5f7lm',true,NOW()), -- role:manage
('ckx4z2yqr1011n8h8t6p5f7lw','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00u0n8h8t6p5f7ke',true,NOW()), -- permission:read
('ckx4z2yqr1012n8h8t6p5f7lx','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00v0n8h8t6p5f7kf',true,NOW()), -- permission:manage

-- Platform Administration
('ckx4z2yqr1013n8h8t6p5f7ly','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00w0n8h8t6p5f7kg',true,NOW()), -- platform:admin
('ckx4z2yqr1014n8h8t6p5f7lz','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00x0n8h8t6p5f7kh',true,NOW()), -- platform:monitor

-- Analytics & Intelligence
('ckx4z2yqr1015n8h8t6p5f7ma','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00y0n8h8t6p5f7ki',true,NOW()), -- analytics:read
('ckx4z2yqr1016n8h8t6p5f7mb','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr00z0n8h8t6p5f7kj',true,NOW()), -- analytics:manage
('ckx4z2yqr1017n8h8t6p5f7mc','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0100n8h8t6p5f7kk',true,NOW()), -- intelligence:query
('ckx4z2yqr1018n8h8t6p5f7md','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0110n8h8t6p5f7kl',true,NOW()), -- intelligence:analyze
('ckx4z2yqr1019n8h8t6p5f7me','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0120n8h8t6p5f7km',true,NOW()), -- intelligence:optimize
('ckx4z2yqr101an8h8t6p5f7mf','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0130n8h8t6p5f7kn',true,NOW()), -- intelligence:manage

-- API & Commodity Management
('ckx4z2yqr101bn8h8t6p5f7mg','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0140n8h8t6p5f7ko',true,NOW()), -- api:access
('ckx4z2yqr101cn8h8t6p5f7mh','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0150n8h8t6p5f7kp',true,NOW()), -- api:manage
('ckx4z2yqr101dn8h8t6p5f7mi','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0160n8h8t6p5f7kq',true,NOW()), -- commodity:read
('ckx4z2yqr101en8h8t6p5f7mj','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0170n8h8t6p5f7kr',true,NOW()), -- commodity:manage

-- Marketplace Management
('ckx4z2yqr101fn8h8t6p5f7mk','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0180n8h8t6p5f7ks',true,NOW()), -- marketplace:browse
('ckx4z2yqr101gn8h8t6p5f7ml','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0190n8h8t6p5f7kt',true,NOW()), -- marketplace:create
('ckx4z2yqr101hn8h8t6p5f7mm','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr01a0n8h8t6p5f7ku',true,NOW()), -- marketplace:read
('ckx4z2yqr101in8h8t6p5f7mn','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr01b0n8h8t6p5f7kv',true,NOW()), -- marketplace:update
('ckx4z2yqr101jn8h8t6p5f7mo','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr01c0n8h8t6p5f7kw',true,NOW()), -- marketplace:delete
('ckx4z2yqr101kn8h8t6p5f7mp','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr01d0n8h8t6p5f7kx',true,NOW()), -- marketplace:manage

-- Financial Management
('ckx4z2yqr101ln8h8t6p5f7mq','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr01e0n8h8t6p5f7ky',true,NOW()), -- transaction:create
('ckx4z2yqr101mn8h8t6p5f7mr','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr01f0n8h8t6p5f7kz',true,NOW()), -- transaction:read
('ckx4z2yqr101nn8h8t6p5f7ms','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0200n8h8t6p5f7la',true,NOW()), -- transaction:update
('ckx4z2yqr101on8h8t6p5f7mt','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0210n8h8t6p5f7lb',true,NOW()), -- transaction:manage

-- Settings & Media Management
('ckx4z2yqr101pn8h8t6p5f7mu','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0220n8h8t6p5f7lc',true,NOW()), -- settings:read
('ckx4z2yqr101qn8h8t6p5f7mv','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0230n8h8t6p5f7ld',true,NOW()), -- settings:update
('ckx4z2yqr101rn8h8t6p5f7mw','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0240n8h8t6p5f7le',true,NOW()), -- settings:manage
('ckx4z2yqr101sn8h8t6p5f7mx','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0250n8h8t6p5f7lf',true,NOW()), -- media:create
('ckx4z2yqr101tn8h8t6p5f7my','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0260n8h8t6p5f7lg',true,NOW()), -- media:upload
('ckx4z2yqr101un8h8t6p5f7mz','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0270n8h8t6p5f7lh',true,NOW()), -- media:read
('ckx4z2yqr101vn8h8t6p5f7na','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0280n8h8t6p5f7li',true,NOW()), -- media:update
('ckx4z2yqr101wn8h8t6p5f7nb','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr0290n8h8t6p5f7lj',true,NOW()), -- media:delete
('ckx4z2yqr101xn8h8t6p5f7nc','ckx4z2yqr0100n8h8t6p5f7ki','ckx4z2yqr02a0n8h8t6p5f7lk',true,NOW()); -- media:manage

-- Organization Admin → organization management permissions
INSERT INTO "role_permissions" ("id","roleId","permissionId","granted","createdAt") VALUES
-- User Management
('ckx4z2yqr1100n8h8t6p5f7kv','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0020n8h8t6p5f7jc',true,NOW()), -- user:create
('ckx4z2yqr1101n8h8t6p5f7kw','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0030n8h8t6p5f7jd',true,NOW()), -- user:read
('ckx4z2yqr1102n8h8t6p5f7kx','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0040n8h8t6p5f7je',true,NOW()), -- user:update
('ckx4z2yqr1103n8h8t6p5f7ky','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0050n8h8t6p5f7jf',true,NOW()), -- user:delete
('ckx4z2yqr1104n8h8t6p5f7kz','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr02d0n8h8t6p5f7ln',true,NOW()), -- user:manage

-- Organization Management
('ckx4z2yqr1105n8h8t6p5f7la','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0070n8h8t6p5f7jh',true,NOW()), -- organization:read
('ckx4z2yqr1106n8h8t6p5f7lb','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0080n8h8t6p5f7ji',true,NOW()), -- organization:update
('ckx4z2yqr1107n8h8t6p5f7lc','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr02e0n8h8t6p5f7lo',true,NOW()), -- organization:manage

-- Farm Management
('ckx4z2yqr1108n8h8t6p5f7ld','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00a0n8h8t6p5f7jk',true,NOW()), -- farm:create
('ckx4z2yqr1109n8h8t6p5f7le','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00b0n8h8t6p5f7jl',true,NOW()), -- farm:read
('ckx4z2yqr110an8h8t6p5f7lf','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00c0n8h8t6p5f7jm',true,NOW()), -- farm:update
('ckx4z2yqr110bn8h8t6p5f7lg','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00d0n8h8t6p5f7jn',true,NOW()), -- farm:delete
('ckx4z2yqr110cn8h8t6p5f7lh','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr02f0n8h8t6p5f7lp',true,NOW()), -- farm:manage

-- Activity Management
('ckx4z2yqr110dn8h8t6p5f7li','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00e0n8h8t6p5f7jo',true,NOW()), -- activity:create
('ckx4z2yqr110en8h8t6p5f7lj','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00f0n8h8t6p5f7jp',true,NOW()), -- activity:read
('ckx4z2yqr110fn8h8t6p5f7lk','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00g0n8h8t6p5f7jq',true,NOW()), -- activity:update
('ckx4z2yqr110gn8h8t6p5f7ll','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00h0n8h8t6p5f7jr',true,NOW()), -- activity:delete
('ckx4z2yqr110hn8h8t6p5f7lm','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0300n8h8t6p5f7lq',true,NOW()), -- activity:assign
('ckx4z2yqr110in8h8t6p5f7ln','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0310n8h8t6p5f7lr',true,NOW()), -- activity:manage

-- Inventory Management
('ckx4z2yqr110jn8h8t6p5f7lo','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00i0n8h8t6p5f7js',true,NOW()), -- inventory:create
('ckx4z2yqr110kn8h8t6p5f7lp','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00j0n8h8t6p5f7jt',true,NOW()), -- inventory:read
('ckx4z2yqr110ln8h8t6p5f7lq','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00k0n8h8t6p5f7ju',true,NOW()), -- inventory:update
('ckx4z2yqr110mn8h8t6p5f7lr','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00l0n8h8t6p5f7jv',true,NOW()), -- inventory:delete
('ckx4z2yqr110nn8h8t6p5f7ls','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0320n8h8t6p5f7ls',true,NOW()), -- inventory:manage

-- Order Management
('ckx4z2yqr110on8h8t6p5f7lt','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00m0n8h8t6p5f7jw',true,NOW()), -- order:create
('ckx4z2yqr110pn8h8t6p5f7lu','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00n0n8h8t6p5f7jx',true,NOW()), -- order:read
('ckx4z2yqr110qn8h8t6p5f7lv','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00o0n8h8t6p5f7jy',true,NOW()), -- order:update
('ckx4z2yqr110rn8h8t6p5f7lw','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00p0n8h8t6p5f7jz',true,NOW()), -- order:delete
('ckx4z2yqr110sn8h8t6p5f7lx','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0330n8h8t6p5f7lt',true,NOW()), -- order:manage

-- Role & Permission Management
('ckx4z2yqr110tn8h8t6p5f7ly','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00q0n8h8t6p5f7ka',true,NOW()), -- role:create
('ckx4z2yqr110un8h8t6p5f7lz','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00r0n8h8t6p5f7kb',true,NOW()), -- role:read
('ckx4z2yqr110vn8h8t6p5f7ma','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00s0n8h8t6p5f7kc',true,NOW()), -- role:update
('ckx4z2yqr110wn8h8t6p5f7mb','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00t0n8h8t6p5f7kd',true,NOW()), -- role:delete
('ckx4z2yqr110xn8h8t6p5f7mc','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr02b0n8h8t6p5f7ll',true,NOW()), -- role:assign
('ckx4z2yqr110yn8h8t6p5f7md','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr02c0n8h8t6p5f7lm',true,NOW()), -- role:manage
('ckx4z2yqr110zn8h8t6p5f7me','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00u0n8h8t6p5f7ke',true,NOW()), -- permission:read
('ckx4z2yqr1110n8h8t6p5f7mf','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00v0n8h8t6p5f7kf',true,NOW()), -- permission:manage

-- Analytics & Intelligence
('ckx4z2yqr1111n8h8t6p5f7mg','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00y0n8h8t6p5f7ki',true,NOW()), -- analytics:read
('ckx4z2yqr1112n8h8t6p5f7mh','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr00z0n8h8t6p5f7kj',true,NOW()), -- analytics:manage
('ckx4z2yqr1113n8h8t6p5f7mi','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0100n8h8t6p5f7kk',true,NOW()), -- intelligence:query
('ckx4z2yqr1114n8h8t6p5f7mj','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0110n8h8t6p5f7kl',true,NOW()), -- intelligence:analyze
('ckx4z2yqr1115n8h8t6p5f7mk','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0120n8h8t6p5f7km',true,NOW()), -- intelligence:optimize
('ckx4z2yqr1116n8h8t6p5f7ml','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0130n8h8t6p5f7kn',true,NOW()), -- intelligence:manage

-- API & Commodity Management
('ckx4z2yqr1117n8h8t6p5f7mm','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0140n8h8t6p5f7ko',true,NOW()), -- api:access
('ckx4z2yqr1118n8h8t6p5f7mn','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0150n8h8t6p5f7kp',true,NOW()), -- api:manage
('ckx4z2yqr1119n8h8t6p5f7mo','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0160n8h8t6p5f7kq',true,NOW()), -- commodity:read
('ckx4z2yqr111an8h8t6p5f7mp','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0170n8h8t6p5f7kr',true,NOW()), -- commodity:manage

-- Marketplace Management
('ckx4z2yqr111bn8h8t6p5f7mq','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0180n8h8t6p5f7ks',true,NOW()), -- marketplace:browse
('ckx4z2yqr111cn8h8t6p5f7mr','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0190n8h8t6p5f7kt',true,NOW()), -- marketplace:create
('ckx4z2yqr111dn8h8t6p5f7ms','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr01a0n8h8t6p5f7ku',true,NOW()), -- marketplace:read
('ckx4z2yqr111en8h8t6p5f7mt','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr01b0n8h8t6p5f7kv',true,NOW()), -- marketplace:update
('ckx4z2yqr111fn8h8t6p5f7mu','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr01c0n8h8t6p5f7kw',true,NOW()), -- marketplace:delete
('ckx4z2yqr111gn8h8t6p5f7mv','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr01d0n8h8t6p5f7kx',true,NOW()), -- marketplace:manage

-- Financial Management
('ckx4z2yqr111hn8h8t6p5f7mw','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr01e0n8h8t6p5f7ky',true,NOW()), -- transaction:create
('ckx4z2yqr111in8h8t6p5f7mx','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr01f0n8h8t6p5f7kz',true,NOW()), -- transaction:read
('ckx4z2yqr111jn8h8t6p5f7my','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0200n8h8t6p5f7la',true,NOW()), -- transaction:update
('ckx4z2yqr111kn8h8t6p5f7mz','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0210n8h8t6p5f7lb',true,NOW()), -- transaction:manage

-- Settings & Media Management
('ckx4z2yqr111ln8h8t6p5f7na','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0220n8h8t6p5f7lc',true,NOW()), -- settings:read
('ckx4z2yqr111mn8h8t6p5f7nb','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0230n8h8t6p5f7ld',true,NOW()), -- settings:update
('ckx4z2yqr111nn8h8t6p5f7nc','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0240n8h8t6p5f7le',true,NOW()), -- settings:manage
('ckx4z2yqr111on8h8t6p5f7nd','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0250n8h8t6p5f7lf',true,NOW()), -- media:create
('ckx4z2yqr111pn8h8t6p5f7ne','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0260n8h8t6p5f7lg',true,NOW()), -- media:upload
('ckx4z2yqr111qn8h8t6p5f7nf','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0270n8h8t6p5f7lh',true,NOW()), -- media:read
('ckx4z2yqr111rn8h8t6p5f7ng','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0280n8h8t6p5f7li',true,NOW()), -- media:update
('ckx4z2yqr111sn8h8t6p5f7nh','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr0290n8h8t6p5f7lj',true,NOW()), -- media:delete
('ckx4z2yqr111tn8h8t6p5f7ni','ckx4z2yqr0120n8h8t6p5f7kl','ckx4z2yqr02a0n8h8t6p5f7lk',true,NOW()); -- media:manage

-- Platform Member → read-only (read + monitor permissions)
INSERT INTO "role_permissions" ("id","roleId","permissionId","granted","createdAt") VALUES
('ckx4z2yqr1200n8h8t6p5f7nj','ckx4z2yqr0110n8h8t6p5f7kj','ckx4z2yqr0030n8h8t6p5f7jd',true,NOW()), -- user:read
('ckx4z2yqr1201n8h8t6p5f7nk','ckx4z2yqr0110n8h8t6p5f7kj','ckx4z2yqr0070n8h8t6p5f7jh',true,NOW()), -- organization:read
('ckx4z2yqr1202n8h8t6p5f7nl','ckx4z2yqr0110n8h8t6p5f7kj','ckx4z2yqr00b0n8h8t6p5f7jl',true,NOW()), -- farm:read
('ckx4z2yqr1203n8h8t6p5f7nm','ckx4z2yqr0110n8h8t6p5f7kj','ckx4z2yqr00f0n8h8t6p5f7jp',true,NOW()), -- activity:read
('ckx4z2yqr1204n8h8t6p5f7nn','ckx4z2yqr0110n8h8t6p5f7kj','ckx4z2yqr00j0n8h8t6p5f7jt',true,NOW()), -- inventory:read
('ckx4z2yqr1205n8h8t6p5f7no','ckx4z2yqr0110n8h8t6p5f7kj','ckx4z2yqr00n0n8h8t6p5f7jx',true,NOW()), -- order:read
('ckx4z2yqr1206n8h8t6p5f7np','ckx4z2yqr0110n8h8t6p5f7kj','ckx4z2yqr00r0n8h8t6p5f7kb',true,NOW()), -- role:read
('ckx4z2yqr1207n8h8t6p5f7nq','ckx4z2yqr0110n8h8t6p5f7kj','ckx4z2yqr00u0n8h8t6p5f7ke',true,NOW()), -- permission:read
('ckx4z2yqr1208n8h8t6p5f7nr','ckx4z2yqr0110n8h8t6p5f7kj','ckx4z2yqr00x0n8h8t6p5f7kh',true,NOW()); -- platform:monitor

-- 5️⃣ Plan-based Role Permission Mappings
-- FREE Plan User → Basic read-only permissions
INSERT INTO "role_permissions" ("id","roleId","permissionId","granted","createdAt") VALUES
('ckx4z2yqr1200n8h8t6p5f7me','ckx4z2yqr0400n8h8t6p5f7ma','ckx4z2yqr0030n8h8t6p5f7jd',true,NOW()), -- user:read
('ckx4z2yqr1201n8h8t6p5f7mf','ckx4z2yqr0400n8h8t6p5f7ma','ckx4z2yqr0070n8h8t6p5f7jh',true,NOW()), -- organization:read
('ckx4z2yqr1202n8h8t6p5f7mg','ckx4z2yqr0400n8h8t6p5f7ma','ckx4z2yqr00b0n8h8t6p5f7jl',true,NOW()), -- farm:read
('ckx4z2yqr1203n8h8t6p5f7mh','ckx4z2yqr0400n8h8t6p5f7ma','ckx4z2yqr00f0n8h8t6p5f7jp',true,NOW()), -- activity:read
('ckx4z2yqr1204n8h8t6p5f7mi','ckx4z2yqr0400n8h8t6p5f7ma','ckx4z2yqr00j0n8h8t6p5f7jt',true,NOW()), -- inventory:read
('ckx4z2yqr1205n8h8t6p5f7mj','ckx4z2yqr0400n8h8t6p5f7ma','ckx4z2yqr00n0n8h8t6p5f7jx',true,NOW()), -- order:read
('ckx4z2yqr1206n8h8t6p5f7mk','ckx4z2yqr0400n8h8t6p5f7ma','ckx4z2yqr01a0n8h8t6p5f7ku',true,NOW()), -- marketplace:read
('ckx4z2yqr1207n8h8t6p5f7ml','ckx4z2yqr0400n8h8t6p5f7ma','ckx4z2yqr0270n8h8t6p5f7lh',true,NOW()), -- media:read
('ckx4z2yqr1208n8h8t6p5f7mm','ckx4z2yqr0400n8h8t6p5f7ma','ckx4z2yqr01f0n8h8t6p5f7kz',true,NOW()), -- transaction:read
('ckx4z2yqr1209n8h8t6p5f7mn','ckx4z2yqr0400n8h8t6p5f7ma','ckx4z2yqr0220n8h8t6p5f7lc',true,NOW()); -- settings:read

-- BASIC Plan User → Basic management permissions
INSERT INTO "role_permissions" ("id","roleId","permissionId","granted","createdAt") VALUES
('ckx4z2yqr1300n8h8t6p5f7mo','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr0030n8h8t6p5f7jd',true,NOW()), -- user:read
('ckx4z2yqr1301n8h8t6p5f7mp','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr0040n8h8t6p5f7je',true,NOW()), -- user:update
('ckx4z2yqr1302n8h8t6p5f7mq','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr0070n8h8t6p5f7jh',true,NOW()), -- organization:read
('ckx4z2yqr1303n8h8t6p5f7mr','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr00a0n8h8t6p5f7jk',true,NOW()), -- farm:create
('ckx4z2yqr1304n8h8t6p5f7ms','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr00b0n8h8t6p5f7jl',true,NOW()), -- farm:read
('ckx4z2yqr1305n8h8t6p5f7mt','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr00c0n8h8t6p5f7jm',true,NOW()), -- farm:update
('ckx4z2yqr1306n8h8t6p5f7mu','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr00e0n8h8t6p5f7jo',true,NOW()), -- activity:create
('ckx4z2yqr1307n8h8t6p5f7mv','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr00f0n8h8t6p5f7jp',true,NOW()), -- activity:read
('ckx4z2yqr1308n8h8t6p5f7mw','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr00g0n8h8t6p5f7jq',true,NOW()), -- activity:update
('ckx4z2yqr1309n8h8t6p5f7mx','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr00i0n8h8t6p5f7js',true,NOW()), -- inventory:create
('ckx4z2yqr130an8h8t6p5f7my','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr00j0n8h8t6p5f7jt',true,NOW()), -- inventory:read
('ckx4z2yqr130bn8h8t6p5f7mz','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr00k0n8h8t6p5f7ju',true,NOW()), -- inventory:update
('ckx4z2yqr130cn8h8t6p5f7na','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr00m0n8h8t6p5f7jw',true,NOW()), -- order:create
('ckx4z2yqr130dn8h8t6p5f7nb','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr00n0n8h8t6p5f7jx',true,NOW()), -- order:read
('ckx4z2yqr130en8h8t6p5f7nc','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr00o0n8h8t6p5f7jy',true,NOW()), -- order:update
('ckx4z2yqr130fn8h8t6p5f7nd','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr01a0n8h8t6p5f7ku',true,NOW()), -- marketplace:read
('ckx4z2yqr130gn8h8t6p5f7ne','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr0250n8h8t6p5f7lf',true,NOW()), -- media:create
('ckx4z2yqr130hn8h8t6p5f7nf','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr0270n8h8t6p5f7lh',true,NOW()), -- media:read
('ckx4z2yqr130in8h8t6p5f7ng','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr01e0n8h8t6p5f7ky',true,NOW()), -- transaction:create
('ckx4z2yqr130jn8h8t6p5f7nh','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr01f0n8h8t6p5f7kz',true,NOW()), -- transaction:read
('ckx4z2yqr130kn8h8t6p5f7ni','ckx4z2yqr0410n8h8t6p5f7mb','ckx4z2yqr0220n8h8t6p5f7lc',true,NOW()); -- settings:read

-- PRO Plan User → Advanced permissions including analytics and AI
INSERT INTO "role_permissions" ("id","roleId","permissionId","granted","createdAt") VALUES
-- Include all BASIC permissions plus PRO features
('ckx4z2yqr1400n8h8t6p5f7nj','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr00y0n8h8t6p5f7ki',true,NOW()), -- analytics:read
('ckx4z2yqr1401n8h8t6p5f7nk','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr00z0n8h8t6p5f7kj',true,NOW()), -- analytics:manage
('ckx4z2yqr1402n8h8t6p5f7nl','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr0100n8h8t6p5f7kk',true,NOW()), -- intelligence:query
('ckx4z2yqr1403n8h8t6p5f7nm','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr0110n8h8t6p5f7kl',true,NOW()), -- intelligence:analyze
('ckx4z2yqr1404n8h8t6p5f7nn','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr0120n8h8t6p5f7km',true,NOW()), -- intelligence:optimize
('ckx4z2yqr1405n8h8t6p5f7no','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr0140n8h8t6p5f7ko',true,NOW()), -- api:access
('ckx4z2yqr1406n8h8t6p5f7np','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr02b0n8h8t6p5f7ll',true,NOW()), -- role:assign
('ckx4z2yqr1407n8h8t6p5f7nq','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr00q0n8h8t6p5f7ka',true,NOW()), -- role:create
('ckx4z2yqr1408n8h8t6p5f7nr','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr00r0n8h8t6p5f7kb',true,NOW()), -- role:read
('ckx4z2yqr1409n8h8t6p5f7ns','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr00s0n8h8t6p5f7kc',true,NOW()), -- role:update
('ckx4z2yqr140an8h8t6p5f7nt','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr00t0n8h8t6p5f7kd',true,NOW()), -- role:delete
('ckx4z2yqr140bn8h8t6p5f7nu','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr0190n8h8t6p5f7kt',true,NOW()), -- marketplace:create
('ckx4z2yqr140cn8h8t6p5f7nv','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr01b0n8h8t6p5f7kv',true,NOW()), -- marketplace:update
('ckx4z2yqr140dn8h8t6p5f7nw','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr01c0n8h8t6p5f7kw',true,NOW()), -- marketplace:delete
('ckx4z2yqr140en8h8t6p5f7nx','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr0200n8h8t6p5f7la',true,NOW()), -- transaction:update
('ckx4z2yqr140fn8h8t6p5f7ny','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr0230n8h8t6p5f7ld',true,NOW()), -- settings:update
('ckx4z2yqr140gn8h8t6p5f7nz','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr0280n8h8t6p5f7li',true,NOW()), -- media:update
('ckx4z2yqr140hn8h8t6p5f7oa','ckx4z2yqr0420n8h8t6p5f7mc','ckx4z2yqr0290n8h8t6p5f7lj',true,NOW()); -- media:delete

-- ENTERPRISE Plan User → All permissions
INSERT INTO "role_permissions" ("id","roleId","permissionId","granted","createdAt") VALUES
-- Include all permissions for ENTERPRISE users
('ckx4z2yqr1500n8h8t6p5f7ob','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0020n8h8t6p5f7jc',true,NOW()), -- user:create
('ckx4z2yqr1501n8h8t6p5f7oc','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0030n8h8t6p5f7jd',true,NOW()), -- user:read
('ckx4z2yqr1502n8h8t6p5f7od','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0040n8h8t6p5f7je',true,NOW()), -- user:update
('ckx4z2yqr1503n8h8t6p5f7oe','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0050n8h8t6p5f7jf',true,NOW()), -- user:delete
('ckx4z2yqr1504n8h8t6p5f7of','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr02d0n8h8t6p5f7ln',true,NOW()), -- user:manage
('ckx4z2yqr1505n8h8t6p5f7og','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0060n8h8t6p5f7jg',true,NOW()), -- organization:create
('ckx4z2yqr1506n8h8t6p5f7oh','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0070n8h8t6p5f7jh',true,NOW()), -- organization:read
('ckx4z2yqr1507n8h8t6p5f7oi','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0080n8h8t6p5f7ji',true,NOW()), -- organization:update
('ckx4z2yqr1508n8h8t6p5f7oj','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0090n8h8t6p5f7jj',true,NOW()), -- organization:delete
('ckx4z2yqr1509n8h8t6p5f7ok','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr02e0n8h8t6p5f7lo',true,NOW()), -- organization:manage
('ckx4z2yqr150an8h8t6p5f7ol','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00a0n8h8t6p5f7jk',true,NOW()), -- farm:create
('ckx4z2yqr150bn8h8t6p5f7om','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00b0n8h8t6p5f7jl',true,NOW()), -- farm:read
('ckx4z2yqr150cn8h8t6p5f7on','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00c0n8h8t6p5f7jm',true,NOW()), -- farm:update
('ckx4z2yqr150dn8h8t6p5f7oo','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00d0n8h8t6p5f7jn',true,NOW()), -- farm:delete
('ckx4z2yqr150en8h8t6p5f7op','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr02f0n8h8t6p5f7lp',true,NOW()), -- farm:manage
('ckx4z2yqr150fn8h8t6p5f7oq','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00e0n8h8t6p5f7jo',true,NOW()), -- activity:create
('ckx4z2yqr150gn8h8t6p5f7or','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00f0n8h8t6p5f7jp',true,NOW()), -- activity:read
('ckx4z2yqr150hn8h8t6p5f7os','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00g0n8h8t6p5f7jq',true,NOW()), -- activity:update
('ckx4z2yqr150in8h8t6p5f7ot','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00h0n8h8t6p5f7jr',true,NOW()), -- activity:delete
('ckx4z2yqr150jn8h8t6p5f7ou','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0300n8h8t6p5f7lq',true,NOW()), -- activity:assign
('ckx4z2yqr150kn8h8t6p5f7ov','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0310n8h8t6p5f7lr',true,NOW()), -- activity:manage
('ckx4z2yqr150ln8h8t6p5f7ow','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00i0n8h8t6p5f7js',true,NOW()), -- inventory:create
('ckx4z2yqr150mn8h8t6p5f7ox','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00j0n8h8t6p5f7jt',true,NOW()), -- inventory:read
('ckx4z2yqr150nn8h8t6p5f7oy','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00k0n8h8t6p5f7ju',true,NOW()), -- inventory:update
('ckx4z2yqr150on8h8t6p5f7oz','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00l0n8h8t6p5f7jv',true,NOW()), -- inventory:delete
('ckx4z2yqr150pn8h8t6p5f7pa','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0320n8h8t6p5f7ls',true,NOW()), -- inventory:manage
('ckx4z2yqr150qn8h8t6p5f7pb','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00m0n8h8t6p5f7jw',true,NOW()), -- order:create
('ckx4z2yqr150rn8h8t6p5f7pc','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00n0n8h8t6p5f7jx',true,NOW()), -- order:read
('ckx4z2yqr150sn8h8t6p5f7pd','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00o0n8h8t6p5f7jy',true,NOW()), -- order:update
('ckx4z2yqr150tn8h8t6p5f7pe','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00p0n8h8t6p5f7jz',true,NOW()), -- order:delete
('ckx4z2yqr150un8h8t6p5f7pf','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0330n8h8t6p5f7lt',true,NOW()), -- order:manage
('ckx4z2yqr150vn8h8t6p5f7pg','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00y0n8h8t6p5f7ki',true,NOW()), -- analytics:read
('ckx4z2yqr150wn8h8t6p5f7ph','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00z0n8h8t6p5f7kj',true,NOW()), -- analytics:manage
('ckx4z2yqr150xn8h8t6p5f7pi','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0100n8h8t6p5f7kk',true,NOW()), -- intelligence:query
('ckx4z2yqr150yn8h8t6p5f7pj','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0110n8h8t6p5f7kl',true,NOW()), -- intelligence:analyze
('ckx4z2yqr150zn8h8t6p5f7pk','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0120n8h8t6p5f7km',true,NOW()), -- intelligence:optimize
('ckx4z2yqr1510n8h8t6p5f7pl','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0130n8h8t6p5f7kn',true,NOW()), -- intelligence:manage
('ckx4z2yqr1511n8h8t6p5f7pm','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0140n8h8t6p5f7ko',true,NOW()), -- api:access
('ckx4z2yqr1512n8h8t6p5f7pn','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0150n8h8t6p5f7kp',true,NOW()), -- api:manage
('ckx4z2yqr1513n8h8t6p5f7po','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0160n8h8t6p5f7kq',true,NOW()), -- commodity:read
('ckx4z2yqr1514n8h8t6p5f7pp','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0170n8h8t6p5f7kr',true,NOW()), -- commodity:manage
('ckx4z2yqr1515n8h8t6p5f7pq','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0180n8h8t6p5f7ks',true,NOW()), -- marketplace:browse
('ckx4z2yqr1516n8h8t6p5f7pr','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0190n8h8t6p5f7kt',true,NOW()), -- marketplace:create
('ckx4z2yqr1517n8h8t6p5f7ps','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr01a0n8h8t6p5f7ku',true,NOW()), -- marketplace:read
('ckx4z2yqr1518n8h8t6p5f7pt','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr01b0n8h8t6p5f7kv',true,NOW()), -- marketplace:update
('ckx4z2yqr1519n8h8t6p5f7pu','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr01c0n8h8t6p5f7kw',true,NOW()), -- marketplace:delete
('ckx4z2yqr151an8h8t6p5f7pv','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr01d0n8h8t6p5f7kx',true,NOW()), -- marketplace:manage
('ckx4z2yqr151bn8h8t6p5f7pw','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr01e0n8h8t6p5f7ky',true,NOW()), -- transaction:create
('ckx4z2yqr151cn8h8t6p5f7px','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr01f0n8h8t6p5f7kz',true,NOW()), -- transaction:read
('ckx4z2yqr151dn8h8t6p5f7py','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0200n8h8t6p5f7la',true,NOW()), -- transaction:update
('ckx4z2yqr151en8h8t6p5f7pz','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0210n8h8t6p5f7lb',true,NOW()), -- transaction:manage
('ckx4z2yqr151fn8h8t6p5f7qa','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0220n8h8t6p5f7lc',true,NOW()), -- settings:read
('ckx4z2yqr151gn8h8t6p5f7qb','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0230n8h8t6p5f7ld',true,NOW()), -- settings:update
('ckx4z2yqr151hn8h8t6p5f7qc','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0240n8h8t6p5f7le',true,NOW()), -- settings:manage
('ckx4z2yqr151in8h8t6p5f7qd','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0250n8h8t6p5f7lf',true,NOW()), -- media:create
('ckx4z2yqr151jn8h8t6p5f7qe','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0260n8h8t6p5f7lg',true,NOW()), -- media:upload
('ckx4z2yqr151kn8h8t6p5f7qf','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0270n8h8t6p5f7lh',true,NOW()), -- media:read
('ckx4z2yqr151ln8h8t6p5f7qg','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0280n8h8t6p5f7li',true,NOW()), -- media:update
('ckx4z2yqr151mn8h8t6p5f7qh','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr0290n8h8t6p5f7lj',true,NOW()), -- media:delete
('ckx4z2yqr151nn8h8t6p5f7qi','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr02a0n8h8t6p5f7lk',true,NOW()), -- media:manage
('ckx4z2yqr151on8h8t6p5f7qj','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00q0n8h8t6p5f7ka',true,NOW()), -- role:create
('ckx4z2yqr151pn8h8t6p5f7qk','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00r0n8h8t6p5f7kb',true,NOW()), -- role:read
('ckx4z2yqr151qn8h8t6p5f7ql','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00s0n8h8t6p5f7kc',true,NOW()), -- role:update
('ckx4z2yqr151rn8h8t6p5f7qm','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00t0n8h8t6p5f7kd',true,NOW()), -- role:delete
('ckx4z2yqr151sn8h8t6p5f7qn','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr02b0n8h8t6p5f7ll',true,NOW()), -- role:assign
('ckx4z2yqr151tn8h8t6p5f7qo','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr02c0n8h8t6p5f7lm',true,NOW()), -- role:manage
('ckx4z2yqr151un8h8t6p5f7qp','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00u0n8h8t6p5f7ke',true,NOW()), -- permission:read
('ckx4z2yqr151vn8h8t6p5f7qq','ckx4z2yqr0430n8h8t6p5f7md','ckx4z2yqr00v0n8h8t6p5f7kf',true,NOW()); -- permission:manage

-- 6️⃣ Team Role Template Permission Mappings
-- Farm Manager → Management permissions
INSERT INTO "role_permissions" ("id","roleId","permissionId","granted","createdAt") VALUES
('ckx4z2yqr1600n8h8t6p5f7nr','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00a0n8h8t6p5f7jk',true,NOW()), -- farm:create
('ckx4z2yqr1601n8h8t6p5f7ns','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00b0n8h8t6p5f7jl',true,NOW()), -- farm:read
('ckx4z2yqr1602n8h8t6p5f7nt','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00c0n8h8t6p5f7jm',true,NOW()), -- farm:update
('ckx4z2yqr1603n8h8t6p5f7nu','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00d0n8h8t6p5f7jn',true,NOW()), -- farm:delete
('ckx4z2yqr1604n8h8t6p5f7nv','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00e0n8h8t6p5f7jo',true,NOW()), -- activity:create
('ckx4z2yqr1605n8h8t6p5f7nw','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00f0n8h8t6p5f7jp',true,NOW()), -- activity:read
('ckx4z2yqr1606n8h8t6p5f7nx','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00g0n8h8t6p5f7jq',true,NOW()), -- activity:update
('ckx4z2yqr1607n8h8t6p5f7ny','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00h0n8h8t6p5f7jr',true,NOW()), -- activity:delete
('ckx4z2yqr1608n8h8t6p5f7nz','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr0300n8h8t6p5f7lq',true,NOW()), -- activity:assign
('ckx4z2yqr1609n8h8t6p5f7oa','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00i0n8h8t6p5f7js',true,NOW()), -- inventory:create
('ckx4z2yqr160an8h8t6p5f7ob','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00j0n8h8t6p5f7jt',true,NOW()), -- inventory:read
('ckx4z2yqr160bn8h8t6p5f7oc','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00k0n8h8t6p5f7ju',true,NOW()), -- inventory:update
('ckx4z2yqr160cn8h8t6p5f7od','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00l0n8h8t6p5f7jv',true,NOW()), -- inventory:delete
('ckx4z2yqr160dn8h8t6p5f7oe','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00m0n8h8t6p5f7jw',true,NOW()), -- order:create
('ckx4z2yqr160en8h8t6p5f7of','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00n0n8h8t6p5f7jx',true,NOW()), -- order:read
('ckx4z2yqr160fn8h8t6p5f7og','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00o0n8h8t6p5f7jy',true,NOW()), -- order:update
('ckx4z2yqr160gn8h8t6p5f7oh','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00p0n8h8t6p5f7jz',true,NOW()), -- order:delete
('ckx4z2yqr160hn8h8t6p5f7oi','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00y0n8h8t6p5f7ki',true,NOW()), -- analytics:read
('ckx4z2yqr160in8h8t6p5f7oj','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr00z0n8h8t6p5f7kj',true,NOW()), -- analytics:manage
('ckx4z2yqr160jn8h8t6p5f7ok','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr0100n8h8t6p5f7kk',true,NOW()), -- intelligence:query
('ckx4z2yqr160kn8h8t6p5f7ol','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr0110n8h8t6p5f7kl',true,NOW()), -- intelligence:analyze
('ckx4z2yqr160ln8h8t6p5f7om','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr0120n8h8t6p5f7km',true,NOW()), -- intelligence:optimize
('ckx4z2yqr160mn8h8t6p5f7on','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr0130n8h8t6p5f7kn',true,NOW()), -- intelligence:manage
('ckx4z2yqr160nn8h8t6p5f7oo','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr0250n8h8t6p5f7lf',true,NOW()), -- media:create
('ckx4z2yqr160on8h8t6p5f7op','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr0260n8h8t6p5f7lg',true,NOW()), -- media:upload
('ckx4z2yqr160pn8h8t6p5f7oq','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr0270n8h8t6p5f7lh',true,NOW()), -- media:read
('ckx4z2yqr160qn8h8t6p5f7or','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr0280n8h8t6p5f7li',true,NOW()), -- media:update
('ckx4z2yqr160rn8h8t6p5f7os','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr0290n8h8t6p5f7lj',true,NOW()), -- media:delete
('ckx4z2yqr160sn8h8t6p5f7ot','ckx4z2yqr0500n8h8t6p5f7na','ckx4z2yqr02a0n8h8t6p5f7lk',true,NOW()); -- media:manage

-- Field Worker → Field operation permissions
INSERT INTO "role_permissions" ("id","roleId","permissionId","granted","createdAt") VALUES
('ckx4z2yqr1700n8h8t6p5f7ou','ckx4z2yqr0510n8h8t6p5f7nb','ckx4z2yqr00b0n8h8t6p5f7jl',true,NOW()), -- farm:read
('ckx4z2yqr1701n8h8t6p5f7ov','ckx4z2yqr0510n8h8t6p5f7nb','ckx4z2yqr00f0n8h8t6p5f7jp',true,NOW()), -- activity:read
('ckx4z2yqr1702n8h8t6p5f7ow','ckx4z2yqr0510n8h8t6p5f7nb','ckx4z2yqr00g0n8h8t6p5f7jq',true,NOW()), -- activity:update
('ckx4z2yqr1703n8h8t6p5f7ox','ckx4z2yqr0510n8h8t6p5f7nb','ckx4z2yqr00j0n8h8t6p5f7jt',true,NOW()), -- inventory:read
('ckx4z2yqr1704n8h8t6p5f7oy','ckx4z2yqr0510n8h8t6p5f7nb','ckx4z2yqr00k0n8h8t6p5f7ju',true,NOW()), -- inventory:update
('ckx4z2yqr1705n8h8t6p5f7oz','ckx4z2yqr0510n8h8t6p5f7nb','ckx4z2yqr00n0n8h8t6p5f7jx',true,NOW()), -- order:read
('ckx4z2yqr1706n8h8t6p5f7pa','ckx4z2yqr0510n8h8t6p5f7nb','ckx4z2yqr00o0n8h8t6p5f7jy',true,NOW()), -- order:update
('ckx4z2yqr1707n8h8t6p5f7pb','ckx4z2yqr0510n8h8t6p5f7nb','ckx4z2yqr0270n8h8t6p5f7lh',true,NOW()), -- media:read
('ckx4z2yqr1708n8h8t6p5f7pc','ckx4z2yqr0510n8h8t6p5f7nb','ckx4z2yqr0250n8h8t6p5f7lf',true,NOW()), -- media:create
('ckx4z2yqr1709n8h8t6p5f7pd','ckx4z2yqr0510n8h8t6p5f7nb','ckx4z2yqr0260n8h8t6p5f7lg',true,NOW()); -- media:upload

-- Data Entry → Data management permissions
INSERT INTO "role_permissions" ("id","roleId","permissionId","granted","createdAt") VALUES
('ckx4z2yqr1800n8h8t6p5f7pe','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr00b0n8h8t6p5f7jl',true,NOW()), -- farm:read
('ckx4z2yqr1801n8h8t6p5f7pf','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr00e0n8h8t6p5f7jo',true,NOW()), -- activity:create
('ckx4z2yqr1802n8h8t6p5f7pg','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr00f0n8h8t6p5f7jp',true,NOW()), -- activity:read
('ckx4z2yqr1803n8h8t6p5f7ph','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr00g0n8h8t6p5f7jq',true,NOW()), -- activity:update
('ckx4z2yqr1804n8h8t6p5f7pi','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr00i0n8h8t6p5f7js',true,NOW()), -- inventory:create
('ckx4z2yqr1805n8h8t6p5f7pj','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr00j0n8h8t6p5f7jt',true,NOW()), -- inventory:read
('ckx4z2yqr1806n8h8t6p5f7pk','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr00k0n8h8t6p5f7ju',true,NOW()), -- inventory:update
('ckx4z2yqr1807n8h8t6p5f7pl','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr00l0n8h8t6p5f7jv',true,NOW()), -- inventory:delete
('ckx4z2yqr1808n8h8t6p5f7pm','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr00m0n8h8t6p5f7jw',true,NOW()), -- order:create
('ckx4z2yqr1809n8h8t6p5f7pn','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr00n0n8h8t6p5f7jx',true,NOW()), -- order:read
('ckx4z2yqr180an8h8t6p5f7po','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr00o0n8h8t6p5f7jy',true,NOW()), -- order:update
('ckx4z2yqr180bn8h8t6p5f7pp','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr00y0n8h8t6p5f7ki',true,NOW()), -- analytics:read
('ckx4z2yqr180cn8h8t6p5f7pq','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr00z0n8h8t6p5f7kj',true,NOW()), -- analytics:manage
('ckx4z2yqr180dn8h8t6p5f7pr','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr0250n8h8t6p5f7lf',true,NOW()), -- media:create
('ckx4z2yqr180en8h8t6p5f7ps','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr0260n8h8t6p5f7lg',true,NOW()), -- media:upload
('ckx4z2yqr180fn8h8t6p5f7pt','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr0270n8h8t6p5f7lh',true,NOW()), -- media:read
('ckx4z2yqr180gn8h8t6p5f7pu','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr0280n8h8t6p5f7li',true,NOW()), -- media:update
('ckx4z2yqr180hn8h8t6p5f7pv','ckx4z2yqr0520n8h8t6p5f7nc','ckx4z2yqr0290n8h8t6p5f7lj',true,NOW()); -- media:delete

-- Viewer → Read-only permissions
INSERT INTO "role_permissions" ("id","roleId","permissionId","granted","createdAt") VALUES
('ckx4z2yqr1900n8h8t6p5f7pw','ckx4z2yqr0530n8h8t6p5f7nd','ckx4z2yqr0030n8h8t6p5f7jd',true,NOW()), -- user:read
('ckx4z2yqr1901n8h8t6p5f7px','ckx4z2yqr0530n8h8t6p5f7nd','ckx4z2yqr0070n8h8t6p5f7jh',true,NOW()), -- organization:read
('ckx4z2yqr1902n8h8t6p5f7py','ckx4z2yqr0530n8h8t6p5f7nd','ckx4z2yqr00b0n8h8t6p5f7jl',true,NOW()), -- farm:read
('ckx4z2yqr1903n8h8t6p5f7pz','ckx4z2yqr0530n8h8t6p5f7nd','ckx4z2yqr00f0n8h8t6p5f7jp',true,NOW()), -- activity:read
('ckx4z2yqr1904n8h8t6p5f7qa','ckx4z2yqr0530n8h8t6p5f7nd','ckx4z2yqr00j0n8h8t6p5f7jt',true,NOW()), -- inventory:read
('ckx4z2yqr1905n8h8t6p5f7qb','ckx4z2yqr0530n8h8t6p5f7nd','ckx4z2yqr00n0n8h8t6p5f7jx',true,NOW()), -- order:read
('ckx4z2yqr1906n8h8t6p5f7qc','ckx4z2yqr0530n8h8t6p5f7nd','ckx4z2yqr00r0n8h8t6p5f7kb',true,NOW()), -- role:read
('ckx4z2yqr1907n8h8t6p5f7qd','ckx4z2yqr0530n8h8t6p5f7nd','ckx4z2yqr00u0n8h8t6p5f7ke',true,NOW()), -- permission:read
('ckx4z2yqr1908n8h8t6p5f7qe','ckx4z2yqr0530n8h8t6p5f7nd','ckx4z2yqr00y0n8h8t6p5f7ki',true,NOW()), -- analytics:read
('ckx4z2yqr1909n8h8t6p5f7qf','ckx4z2yqr0530n8h8t6p5f7nd','ckx4z2yqr0100n8h8t6p5f7kk',true,NOW()), -- intelligence:query
('ckx4z2yqr190an8h8t6p5f7qg','ckx4z2yqr0530n8h8t6p5f7nd','ckx4z2yqr0110n8h8t6p5f7kl',true,NOW()), -- intelligence:analyze
('ckx4z2yqr190bn8h8t6p5f7qh','ckx4z2yqr0530n8h8t6p5f7nd','ckx4z2yqr0270n8h8t6p5f7lh',true,NOW()); -- media:read
