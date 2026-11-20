// SEC-6: nilai batas DTO per modul lewat ValidationPipe asli (configureApp),
// tanpa DB — controller uji hanya memantulkan body hasil transform.
import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { LoginDto } from '../../src/auth/dto/login.dto';
import { CreateClientDto } from '../../src/clients/dto/create-client.dto';
import { configureApp } from '../../src/config/app-setup';
import { CreateExpenseDto } from '../../src/expenses/dto/create-expense.dto';
import { CreateProjectToolDto } from '../../src/project-tools/dto/create-project-tool.dto';
import { CreateProjectDto } from '../../src/projects/dto/create-project.dto';
import { CreateRabNodeDto } from '../../src/rab/dto/create-rab-node.dto';
import { UpdateRabNodeProgressDto } from '../../src/rab/dto/update-rab-node-progress.dto';
import { CreateTerminDto } from '../../src/termins/dto/create-termin.dto';
import { CreateToolDto } from '../../src/tools/dto/create-tool.dto';
import { UpdateUserDto } from '../../src/users/dto/update-user.dto';
import { CreateVendorDto } from '../../src/vendors/dto/create-vendor.dto';

@Controller('v')
class EchoController {
  @Post('project') project(@Body() d: CreateProjectDto) {
    return d;
  }
  @Post('client') client(@Body() d: CreateClientDto) {
    return d;
  }
  @Post('vendor') vendor(@Body() d: CreateVendorDto) {
    return d;
  }
  @Post('expense') expense(@Body() d: CreateExpenseDto) {
    return d;
  }
  @Post('termin') termin(@Body() d: CreateTerminDto) {
    return d;
  }
  @Post('rab') rab(@Body() d: CreateRabNodeDto) {
    return d;
  }
  @Post('progress') progress(@Body() d: UpdateRabNodeProgressDto) {
    return d;
  }
  @Post('tool') tool(@Body() d: CreateToolDto) {
    return d;
  }
  @Post('project-tool') pt(@Body() d: CreateProjectToolDto) {
    return d;
  }
  @Post('user') user(@Body() d: UpdateUserDto) {
    return d;
  }
  @Post('login') login(@Body() d: LoginDto) {
    return d;
  }
}

const UUID = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';

describe('Validasi DTO bersama (SEC-6) — e2e per modul', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    const m = await Test.createTestingModule({
      controllers: [EchoController],
    }).compile();
    app = m.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(() => app.close());

  const post = (p: string, b: object) =>
    request(app.getHttpServer()).post(`/api/v1/v/${p}`).send(b);

  const project = {
    name: ' Proyek ',
    location: 'Surabaya',
    contractType: 'one_time',
    status: 'Aktif',
    startDate: '2026-01-10',
  };
  it('projects: tolak endDate < startDate & nilai kontrak > 10^15; terima + trim', async () => {
    await post('project', { ...project, endDate: '2026-01-09' }).expect(400);
    await post('project', { ...project, contractValue: 10 ** 15 + 1 }).expect(
      400,
    );
    const r = await post('project', {
      ...project,
      contractValue: 10 ** 15,
      endDate: '2026-01-10',
    });
    expect(r.status).toBe(201);
    expect((r.body as CreateProjectDto).name).toBe('Proyek');
  });

  it('clients: tolak telepon sampah; terima 08… -> +62…, email lowercase', async () => {
    await post('client', { name: 'PT A', phone: 'abc' }).expect(400);
    const r = await post('client', {
      name: 'PT A',
      phone: '08123456789',
      email: ' A@B.CO ',
    }).expect(201);
    expect(r.body).toMatchObject({ phone: '+628123456789', email: 'a@b.co' });
  });

  it('vendors: tolak nama 201 karakter; terima 200', async () => {
    await post('vendor', { name: 'a'.repeat(201) }).expect(400);
    await post('vendor', { name: 'a'.repeat(200) }).expect(201);
  });

  const expense = {
    description: 'x',
    amount: 1,
    expenseDate: '2026-01-01',
    category: 'sewa_alat',
  };
  it('expenses: tolak amount 0 & tanggal 1999; terima amount 1', async () => {
    await post('expense', { ...expense, amount: 0 }).expect(400);
    await post('expense', { ...expense, category: 'xyz' }).expect(400);
    await post('expense', { ...expense, expenseDate: '1999-12-31' }).expect(
      400,
    );
    await post('expense', expense).expect(201);
  });

  const termin = { name: 'T1', type: 'dp', amount: 1 };
  it('termins: tolak amount 0 & dueDate di luar rentang; terima amount 10^15', async () => {
    await post('termin', { ...termin, amount: 0 }).expect(400);
    await post('termin', {
      ...termin,
      dueDate: '1999-01-01',
    }).expect(400);
    await post('termin', { ...termin, amount: 10 ** 15 }).expect(201);
  });

  it('rab: tolak volume 5 desimal; terima 4 desimal; harga upah boleh 0', async () => {
    const n = { nodeType: 'item', name: 'Item' };
    await post('rab', { ...n, volume: 0.00001 }).expect(400);
    await post('rab', { ...n, volume: 0.0001, laborPrice: 0 }).expect(201);
  });

  it('rab progress: tolak 100.01; terima 100', async () => {
    await post('progress', { progressPercent: 100.01 }).expect(400);
    await post('progress', { progressPercent: 100 }).expect(201);
  });

  it('tools: tolak catatan 2001 karakter & qty > 10^9; terima 2000', async () => {
    await post('tool', { name: 'Bor', notes: 'a'.repeat(2001) }).expect(400);
    await post('tool', { name: 'Bor', quantity: 1e9 + 1 }).expect(400);
    await post('tool', { name: 'Bor', notes: 'a'.repeat(2000) }).expect(201);
  });

  it('project-tools: tolak usedTo < usedFrom; terima sama', async () => {
    const b = { toolId: UUID, usedFrom: '2026-03-02' };
    await post('project-tool', { ...b, usedTo: '2026-03-01' }).expect(400);
    await post('project-tool', { ...b, usedTo: '2026-03-02' }).expect(201);
  });

  it('users: tolak email buruk; terima email kapital -> lowercase', async () => {
    await post('user', { email: 'bukan' }).expect(400);
    const r = await post('user', { email: 'Admin@Acme.example' }).expect(201);
    expect((r.body as { email: string }).email).toBe('admin@acme.example');
  });

  it('auth: login email dinormalkan; pesan error berbahasa Indonesia', async () => {
    const r = await post('login', {
      email: ' ADMIN@acme.example ',
      password: 'x',
    }).expect(201);
    expect((r.body as { email: string }).email).toBe('admin@acme.example');
    const bad = await post('login', { email: 'x', password: 'x' }).expect(400);
    expect(JSON.stringify(bad.body)).toContain('email bukan email yang valid');
  });
});
