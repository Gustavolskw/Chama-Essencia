package com.chamaessencia.settings;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import com.chamaessencia.production.ExtraCost;

/** Configurações da loja (documento único, compartilhado por todos os usuários). */
@Document("settings")
public class CompanySettings {

    public static final String ID = "company";

    @Id
    private String id = ID;

    private String storeName = "Chama & Essência";

    /** Custos adicionais por vela sugeridos em todo pacote novo (mão de obra, gás/água...). */
    private List<ExtraCost> defaultExtraCosts = new ArrayList<>(List.of(
            new ExtraCost("Mão de obra", 2.0),
            new ExtraCost("Gás, água e outros", 1.0)));

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }
    public List<ExtraCost> getDefaultExtraCosts() { return defaultExtraCosts; }
    public void setDefaultExtraCosts(List<ExtraCost> defaultExtraCosts) { this.defaultExtraCosts = defaultExtraCosts; }
}
