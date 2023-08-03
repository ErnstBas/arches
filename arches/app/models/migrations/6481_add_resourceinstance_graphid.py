# Generated by Django 2.2.13 on 2020-10-08 16:01

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("models", "6700_unique_nodename"),
    ]

    def forward_migrate(apps, schema_editor, with_create_permissions=True):
        ResourceXResource = apps.get_model("models", "ResourceXResource")

        db_alias = schema_editor.connection.alias

        batch_size = 1000
        counter = 0
        modified_rows = []
        for row in ResourceXResource.objects.using(db_alias).all().iterator(chunk_size=batch_size):
            try:
                row.resourceinstancefrom_graphid = row.resourceinstanceidfrom.graph
            except:
                pass

            try:
                row.resourceinstanceto_graphid = row.resourceinstanceidto.graph
            except:
                pass
            
            modified_rows.append(row)

            if len(modified_rows) == batch_size:
                ResourceXResource.objects.using(db_alias).bulk_update(modified_rows, ["resourceinstanceto_graphid","resourceinstancefrom_graphid"])
                counter += len(modified_rows)
                print("Updated {} rows".format(counter))
                modified_rows = []
                

        if len(modified_rows) > 0:
            ResourceXResource.objects.using(db_alias).bulk_update(modified_rows, ["resourceinstanceto_graphid","resourceinstancefrom_graphid"])
            counter += len(modified_rows)
        
        print("finished updating {} rows".format(counter))

    operations = [
        migrations.AddField(
            model_name="resourcexresource",
            name="resourceinstancefrom_graphid",
            field=models.ForeignKey(
                blank=True,
                db_column="resourceinstancefrom_graphid",
                db_constraint=False,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="resxres_resource_instance_fom_graph_id",
                to="models.GraphModel",
            ),
        ),
        migrations.AddField(
            model_name="resourcexresource",
            name="resourceinstanceto_graphid",
            field=models.ForeignKey(
                blank=True,
                db_column="resourceinstanceto_graphid",
                db_constraint=False,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="resxres_resource_instance_to_graph_id",
                to="models.GraphModel",
            ),
        ),
        migrations.RunPython(forward_migrate, reverse_code=migrations.RunPython.noop),
    ]
