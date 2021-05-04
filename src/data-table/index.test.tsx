import React from 'react';
import TestRenderer from 'react-test-renderer';
import {
  Column,
  DataTable
} from '.';
import {
  findJson
} from "@github1/build-tools";

describe('DataTable', () => {
  it('can have columns', () => {
    const data = [{
      id: 123,
      something: {
        name: 'The name'
      }
    }];
    const table = TestRenderer.create(<DataTable data={data}>
      <Column label="ID" field="id"/>
      <Column label="Name" field="something.name"/>
    </DataTable>).toJSON();
    const columnNames = findJson(table, '$..[?(@.props&& @.props.className == \'th-content\')].children[*]');
    expect(columnNames).toEqual(['ID', 'Name']);
    const values = findJson(table, '$..[?(@.type == \'td\')].children[*]');
    expect(values).toEqual(['123', 'The name']);
  });
});
